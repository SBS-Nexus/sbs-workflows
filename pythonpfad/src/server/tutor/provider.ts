import 'server-only';
import { getEnv } from '@/server/env';
import { RuleBasedTutor } from '@/domain/tutor/rule-based';
import {
  checkTutorGuardrails,
  TUTOR_MODE_LABELS,
  type TutorContext,
  type TutorProvider,
  type TutorReply,
  type TutorRequest,
} from '@/domain/tutor/types';

/**
 * Anbieter-Abstraktion für den Tutor.
 *
 * Aufbau:
 *  1. Der regelbasierte Tutor ist der Standard und läuft immer.
 *  2. Ist ein externer Anbieter konfiguriert UND liegt eine ausdrückliche
 *     Einwilligung vor, wird dieser zusätzlich angefragt.
 *  3. Jede Antwort – auch die eines externen Anbieters – durchläuft die
 *     Leitplanken. Fällt sie durch, wird die regelbasierte Antwort ausgeliefert.
 *
 * An den externen Anbieter geht ausschließlich, was für die Antwort nötig ist:
 * Aufgabenstellung, Konzeptbeschreibungen, der Code im Editor und die
 * Fehlermeldung. Keine E-Mail-Adresse, kein Name, keine Konto-ID, keine
 * Lernhistorie. Die hinterlegte Musterlösung wird niemals übermittelt.
 */

export interface TutorResult {
  reply: TutorReply;
  /** Wurde eine externe Antwort wegen der Leitplanken verworfen? */
  fellBack: boolean;
  fallbackReasons: string[];
}

const SYSTEM_PROMPT = `Du bist ein geduldiger Lerncoach für deutschsprachige Python-Anfängerinnen und -Anfänger.

Deine Aufgabe ist NICHT, Lösungen zu liefern, sondern Denkprozesse anzustoßen.

Regeln, die du immer einhältst:
- Antworte auf Deutsch, in höchstens drei kurzen Absätzen.
- Stelle mindestens eine Frage, die zum nächsten eigenen Schritt führt.
- Gib niemals eine vollständige Lösung aus. Höchstens vier Zeilen Code, und nur, wenn ohne sie nichts erklärbar ist.
- Erkläre Fachbegriffe beim ersten Auftreten in einem Halbsatz.
- Erfinde keine Python-Funktionen. Wenn du unsicher bist, sage das offen und verweise auf docs.python.org.
- Stelle Lernfortschritt nicht beschönigend dar.
- Formuliere nie "das ist ganz einfach", "du musst nur" oder "offensichtlich".

Antworte ausschließlich als JSON-Objekt mit den Feldern:
{"paragraphs": ["..."], "nextStep": "...", "caveat": "..." }`;

export function getTutorProvider(): TutorProvider {
  return new RuleBasedTutor();
}

export async function askTutor(
  request: TutorRequest,
  context: TutorContext,
  options: { consent: boolean; solution?: string | null },
): Promise<TutorResult> {
  const ruleBased = new RuleBasedTutor();
  const baseline = await ruleBased.reply(request, context);

  const env = getEnv();
  const externalConfigured = env.AI_TUTOR_PROVIDER !== 'rule-based' && env.AI_TUTOR_API_KEY !== '';

  if (!externalConfigured || !options.consent) {
    return { reply: baseline, fellBack: false, fallbackReasons: [] };
  }

  try {
    const external = await callExternalProvider(request, context, env);
    if (!external) {
      return { reply: baseline, fellBack: false, fallbackReasons: [] };
    }

    const guardrails = checkTutorGuardrails(external, {
      solution: options.solution ?? null,
      maxHintLevel: context.maxHintLevel,
      hintsRevealed: context.hintsRevealed,
    });

    if (!guardrails.ok) {
      return { reply: baseline, fellBack: true, fallbackReasons: guardrails.violations };
    }

    return { reply: external, fellBack: false, fallbackReasons: [] };
  } catch (error) {
    // Ein Ausfall des externen Anbieters darf den Lernfluss nicht unterbrechen.
    return {
      reply: baseline,
      fellBack: true,
      fallbackReasons: [
        `Der externe Anbieter war nicht erreichbar (${error instanceof Error ? error.name : 'Fehler'}).`,
      ],
    };
  }
}

async function callExternalProvider(
  request: TutorRequest,
  context: TutorContext,
  env: ReturnType<typeof getEnv>,
): Promise<TutorReply | null> {
  // Datenminimierung: Es wird ausschließlich zusammengestellt, was zur
  // Beantwortung nötig ist. Keine Kennungen, keine Historie.
  const userMessage = [
    `Modus: ${TUTOR_MODE_LABELS[request.mode]}`,
    `Aufgabe: ${context.exerciseTitle}`,
    `Aufgabenstellung: ${context.exercisePrompt}`,
    `Beteiligte Konzepte: ${context.concepts.map((c) => `${c.name} – ${c.description}`).join(' | ')}`,
    `Bisherige eigene Versuche: ${context.attempts}`,
    request.question ? `Frage der lernenden Person: ${request.question}` : '',
    request.code ? `Aktueller Code:\n${request.code}` : '',
    request.traceback ? `Fehlermeldung:\n${request.traceback}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response =
      env.AI_TUTOR_PROVIDER === 'anthropic'
        ? await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'content-type': 'application/json',
              'x-api-key': env.AI_TUTOR_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: env.AI_TUTOR_MODEL,
              max_tokens: 800,
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: userMessage }],
            }),
          })
        : await fetch(`${env.AI_TUTOR_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${env.AI_TUTOR_API_KEY}`,
            },
            body: JSON.stringify({
              model: env.AI_TUTOR_MODEL,
              max_tokens: 800,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage },
              ],
            }),
          });

    if (!response.ok) return null;

    const data: unknown = await response.json();
    const text = extractText(data, env.AI_TUTOR_PROVIDER);
    if (!text) return null;

    const parsed = safeParseReply(text);
    if (!parsed) return null;

    return { ...parsed, provider: env.AI_TUTOR_PROVIDER };
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(data: unknown, provider: string): string | null {
  if (typeof data !== 'object' || data === null) return null;

  if (provider === 'anthropic') {
    const content = (data as { content?: Array<{ type?: string; text?: string }> }).content;
    const block = content?.find((c) => c.type === 'text');
    return block?.text ?? null;
  }

  const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? null;
}

function safeParseReply(text: string): Omit<TutorReply, 'provider'> | null {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd <= jsonStart) return null;

  try {
    const parsed: unknown = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as { paragraphs?: unknown; nextStep?: unknown; caveat?: unknown };
    const paragraphs = Array.isArray(record.paragraphs)
      ? record.paragraphs.filter((p): p is string => typeof p === 'string')
      : [];

    if (paragraphs.length === 0 || typeof record.nextStep !== 'string') return null;

    return {
      paragraphs,
      nextStep: record.nextStep,
      ...(typeof record.caveat === 'string' && record.caveat.length > 0
        ? { caveat: record.caveat }
        : {}),
    };
  } catch {
    return null;
  }
}
