import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { listLabsWithStatus } from '@/server/services/lab-service';
import { AppHeader } from '@/components/app/app-header';
import { Badge, Card, SectionHeading } from '@/components/ui/primitives';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Labs', alternates: { canonical: '/labs' } };

const KIND_LABELS: Record<string, string> = {
  TERMINAL: 'Terminal',
  TOKENIZER: 'Tokenizer',
  CONTEXT_WINDOW: 'Kontextfenster',
  PROMPT_REPAIR: 'Prompt-Reparatur',
};

export default async function LabsPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (!user.onboardingCompleted) redirect('/onboarding');

  const labs = await listLabsWithStatus(user.id);

  return (
    <>
      <AppHeader userName={user.name} />
      <main id="hauptinhalt" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Labs"
          description="Interaktive, deterministische Übungen — kein Aufruf an einen externen AI-Anbieter."
        >
          Ausprobieren statt nur lesen
        </SectionHeading>

        <div className="grid gap-4 sm:grid-cols-2">
          {labs.map((lab) => (
            <Link key={lab.slug} href={`/labs/${lab.slug}`}>
              <Card className="h-full transition-colors hover:border-signal-500">
                <div className="flex items-start justify-between gap-2">
                  <Badge tone="info">{KIND_LABELS[lab.kind] ?? lab.kind}</Badge>
                  {lab.completed ? <Badge tone="success">Abgeschlossen</Badge> : null}
                </div>
                <p className="mt-3 font-mono font-semibold">{lab.title}</p>
                <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{lab.summary}</p>
                <p className="mt-3 text-xs text-[var(--fg-muted)]">~{lab.estimatedMinutes} Min.</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
