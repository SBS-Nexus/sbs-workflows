'use client';

import { useActionState, useId, useState } from 'react';
import {
  aendereRolleAktion,
  archiviereTeamAktion,
  benenneUmAktion,
  entferneAusTeamAktion,
  entferneEintragAktion,
  fuegeEintragHinzuAktion,
  legePlanAnAktion,
  loeschePlanAktion,
  verschiebeEintragAktion,
  fuegeHinzuAktion,
  legeTeamAnAktion,
  setzeFreigabeAktion,
  entferneAktion,
  ladeEinAktion,
  legeAnAktion,
  loeseEinAktion,
  verlasseAktion,
  widerrufeAktion,
  type Antwort,
} from '@/app/organisation/aktionen';
import { Button } from '@/components/ui/primitives';

/**
 * Formulare der Organisationen (E5.1). Jede Aktion meldet Erfolg höflich
 * (`role="status"`) und Fehler sofort (`role="alert"`); während sie läuft,
 * ist der Knopf gesperrt und sagt, was passiert.
 */

const LEER: Antwort = {};

function Rueckmeldung({ antwort }: { antwort: Antwort }): React.ReactElement | null {
  if (antwort.meldung) {
    return (
      <p className="field-error" role="alert">
        {antwort.meldung}
      </p>
    );
  }
  if (antwort.erfolg) {
    return (
      <p className="org-erfolg" role="status">
        {antwort.erfolg}
      </p>
    );
  }
  return null;
}

export function AnlegenFormular(): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(legeAnAktion, LEER);
  const id = useId();
  return (
    <form action={aktion} className="vocab-form vocab-form-inline org-form">
      <div className="vocab-field">
        <label htmlFor={`${id}-name`}>Name der Organisation</label>
        <input
          id={`${id}-name`}
          name="name"
          required
          minLength={2}
          maxLength={80}
          autoComplete="organization"
          aria-invalid={antwort.meldung ? true : undefined}
          aria-describedby={antwort.meldung ? `${id}-fehler` : undefined}
        />
      </div>
      <Button type="submit" disabled={laeuft}>
        {laeuft ? 'Wird angelegt …' : 'Organisation anlegen'}
      </Button>
      <div id={`${id}-fehler`}>
        <Rueckmeldung antwort={antwort} />
      </div>
    </form>
  );
}

export function EinladenFormular({
  kuerzel,
  rollen,
  freiePlaetze,
  teams = [],
}: {
  kuerzel: string;
  /** Rollen, mit denen diese Person einladen darf. */
  rollen: ReadonlyArray<{ wert: string; name: string }>;
  freiePlaetze: number;
  /** Offene Teams; wer einlöst, kommt direkt hinein. */
  teams?: ReadonlyArray<{ id: string; name: string }>;
}): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(ladeEinAktion.bind(null, kuerzel), LEER);
  const [kopiert, setKopiert] = useState(false);
  const id = useId();
  return (
    <form action={aktion} className="vocab-form org-form" onSubmit={() => setKopiert(false)}>
      <div className="vocab-form-inline org-felder">
        <div className="vocab-field">
          <label htmlFor={`${id}-rolle`}>Rolle</label>
          <select id={`${id}-rolle`} name="rolle" defaultValue={rollen[rollen.length - 1]?.wert}>
            {rollen.map((r) => (
              <option key={r.wert} value={r.wert}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="vocab-field">
          <label htmlFor={`${id}-email`}>E-Mail-Adresse (optional)</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="off" aria-describedby={`${id}-email-hinweis`} />
        </div>
        {teams.length > 0 ? (
          <div className="vocab-field">
            <label htmlFor={`${id}-team`}>Direkt ins Team (optional)</label>
            <select id={`${id}-team`} name="team" defaultValue="">
              <option value="">Kein Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="vocab-field">
          <label htmlFor={`${id}-anzahl`}>Für wie viele Personen?</label>
          <input
            id={`${id}-anzahl`}
            name="maxNutzungen"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            defaultValue={Math.max(1, Math.min(freiePlaetze, 10))}
            aria-describedby={`${id}-anzahl-hinweis`}
          />
        </div>
      </div>
      <p id={`${id}-email-hinweis`} className="vocab-hint">
        Mit Adresse gilt der Link genau einmal und nur für dieses Konto. Ohne Adresse kann ihn jede Person
        nutzen, die ihn hat – bis zur gewählten Anzahl.
      </p>
      <p id={`${id}-anzahl-hinweis`} className="vocab-hint">
        Der Link gilt 14 Tage. Lernende belegen je einen Platz; frei sind noch {freiePlaetze}.
      </p>
      <div>
        <Button type="submit" disabled={laeuft}>
          {laeuft ? 'Wird erstellt …' : 'Einladungslink erstellen'}
        </Button>
      </div>
      <Rueckmeldung antwort={antwort} />
      {antwort.link ? (
        <div className="org-link">
          <label htmlFor={`${id}-link`}>Einladungslink</label>
          <div className="org-link-zeile">
            <input id={`${id}-link`} readOnly value={antwort.link} onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(antwort.link ?? '').then(() => setKopiert(true));
              }}
            >
              {kopiert ? 'Kopiert' : 'Kopieren'}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function WiderrufenKnopf({ kuerzel, einladung }: { kuerzel: string; einladung: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(widerrufeAktion.bind(null, kuerzel), LEER);
  return (
    <form action={aktion} className="org-inline">
      <input type="hidden" name="einladung" value={einladung} />
      <Button type="submit" variant="secondary" size="sm" disabled={laeuft}>
        {laeuft ? 'Wird zurückgezogen …' : 'Zurückziehen'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function MitgliedVerwalten({
  kuerzel,
  mitglied,
  name,
  rolle,
}: {
  kuerzel: string;
  mitglied: string;
  name: string;
  rolle: string;
}): React.ReactElement {
  const [rollenAntwort, rollenAktion, rolleLaeuft] = useActionState(aendereRolleAktion.bind(null, kuerzel), LEER);
  const [entfernenAntwort, entfernenAktion, entferntLaeuft] = useActionState(entferneAktion.bind(null, kuerzel), LEER);
  const id = useId();
  return (
    <div className="org-verwalten">
      <form action={rollenAktion} className="org-inline">
        <input type="hidden" name="mitglied" value={mitglied} />
        <label htmlFor={`${id}-rolle`} className="visually-hidden">
          Rolle von {name}
        </label>
        <select id={`${id}-rolle`} name="rolle" defaultValue={rolle}>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Lehrkraft</option>
          <option value="LEARNER">Lernend</option>
        </select>
        <Button type="submit" variant="secondary" size="sm" disabled={rolleLaeuft}>
          {rolleLaeuft ? 'Wird gespeichert …' : 'Rolle speichern'}
        </Button>
      </form>
      <form
        action={entfernenAktion}
        className="org-inline"
        onSubmit={(e) => {
          if (!window.confirm(`${name} aus der Organisation entfernen? Der Lernstand bleibt bei der Person.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="mitglied" value={mitglied} />
        <Button type="submit" variant="secondary" size="sm" disabled={entferntLaeuft}>
          {entferntLaeuft ? 'Wird entfernt …' : 'Entfernen'}
        </Button>
      </form>
      <Rueckmeldung antwort={rollenAntwort.meldung || rollenAntwort.erfolg ? rollenAntwort : entfernenAntwort} />
    </div>
  );
}

export function UmbenennenFormular({ kuerzel, name }: { kuerzel: string; name: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(benenneUmAktion.bind(null, kuerzel), LEER);
  const id = useId();
  return (
    <form action={aktion} className="vocab-form vocab-form-inline org-form">
      <div className="vocab-field">
        <label htmlFor={`${id}-name`}>Name der Organisation</label>
        <input id={`${id}-name`} name="name" defaultValue={name} required minLength={2} maxLength={80} />
      </div>
      <Button type="submit" variant="secondary" disabled={laeuft}>
        {laeuft ? 'Wird gespeichert …' : 'Name speichern'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function VerlassenKnopf({ kuerzel, name }: { kuerzel: string; name: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(verlasseAktion.bind(null, kuerzel), LEER);
  return (
    <form
      action={aktion}
      className="org-inline"
      onSubmit={(e) => {
        if (!window.confirm(`„${name}“ verlassen? Dein Lernstand bleibt bei dir.`)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="secondary" disabled={laeuft}>
        {laeuft ? 'Wird verlassen …' : 'Organisation verlassen'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function BeitretenKnopf({ token, organisation }: { token: string; organisation: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(loeseEinAktion.bind(null, token), LEER);
  return (
    <form action={aktion} className="org-form">
      <Button type="submit" disabled={laeuft}>
        {laeuft ? 'Wird beigetreten …' : `${organisation} beitreten`}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// E5.2 — Teams und Einwilligung
// ---------------------------------------------------------------------------

export function TeamAnlegenFormular({ kuerzel }: { kuerzel: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(legeTeamAnAktion.bind(null, kuerzel), LEER);
  const id = useId();
  return (
    <form action={aktion} className="vocab-form vocab-form-inline org-form">
      <div className="vocab-field">
        <label htmlFor={`${id}-name`}>Name des Teams</label>
        <input id={`${id}-name`} name="name" required minLength={2} maxLength={80} />
      </div>
      <Button type="submit" disabled={laeuft}>
        {laeuft ? 'Wird angelegt …' : 'Team anlegen'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function TeamAufnehmenFormular({
  kuerzel,
  team,
  kandidaten,
}: {
  kuerzel: string;
  team: string;
  kandidaten: ReadonlyArray<{ mitgliedId: string; name: string; rolle: string }>;
}): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(fuegeHinzuAktion.bind(null, kuerzel), LEER);
  const id = useId();
  return (
    <form action={aktion} className="vocab-form vocab-form-inline org-form">
      <input type="hidden" name="team" value={team} />
      <div className="vocab-field">
        <label htmlFor={`${id}-mitglied`}>Mitglied der Organisation</label>
        <select id={`${id}-mitglied`} name="mitglied" required defaultValue="">
          <option value="" disabled>
            Person wählen
          </option>
          {kandidaten.map((k) => (
            <option key={k.mitgliedId} value={k.mitgliedId}>
              {k.name} · {k.rolle}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={laeuft}>
        {laeuft ? 'Wird aufgenommen …' : 'Ins Team aufnehmen'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function AusTeamNehmenKnopf({
  kuerzel,
  teamMitglied,
  name,
}: {
  kuerzel: string;
  teamMitglied: string;
  name: string;
}): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(entferneAusTeamAktion.bind(null, kuerzel), LEER);
  return (
    <form action={aktion} className="org-inline">
      <input type="hidden" name="teamMitglied" value={teamMitglied} />
      <Button type="submit" variant="secondary" size="sm" disabled={laeuft} aria-label={`${name} aus dem Team nehmen`}>
        {laeuft ? 'Wird entfernt …' : 'Aus dem Team nehmen'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function TeamArchivierenKnopf({
  kuerzel,
  team,
  archiviert,
}: {
  kuerzel: string;
  team: string;
  archiviert: boolean;
}): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(archiviereTeamAktion.bind(null, kuerzel), LEER);
  return (
    <form action={aktion} className="org-inline">
      <input type="hidden" name="team" value={team} />
      <input type="hidden" name="archivieren" value={archiviert ? '0' : '1'} />
      <Button type="submit" variant="secondary" disabled={laeuft}>
        {laeuft ? 'Einen Moment …' : archiviert ? 'Team wieder öffnen' : 'Team archivieren'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

/** Einwilligung der Person selbst: ein Knopf, der sagt, was danach gilt. */
export function FreigabeSchalter({
  kuerzel,
  teamMitglied,
  team,
  freigabe,
}: {
  kuerzel: string;
  teamMitglied: string;
  team: string;
  freigabe: boolean;
}): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(setzeFreigabeAktion.bind(null, kuerzel), LEER);
  return (
    <form action={aktion} className="org-inline">
      <input type="hidden" name="teamMitglied" value={teamMitglied} />
      <input type="hidden" name="freigabe" value={freigabe ? '0' : '1'} />
      <Button type="submit" variant={freigabe ? 'secondary' : 'primary'} size="sm" disabled={laeuft}>
        {laeuft
          ? 'Wird gespeichert …'
          : freigabe
            ? `In „${team}“ nur noch in Summen zeigen`
            : `In „${team}“ namentlich zeigen`}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// E5.3 — Lernpläne
// ---------------------------------------------------------------------------

export function PlanAnlegenFormular({ kuerzel, team }: { kuerzel: string; team: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(legePlanAnAktion.bind(null, kuerzel), LEER);
  const id = useId();
  return (
    <form action={aktion} className="vocab-form vocab-form-inline org-form">
      <input type="hidden" name="team" value={team} />
      <div className="vocab-field">
        <label htmlFor={`${id}-name`}>Name des Lernplans</label>
        <input id={`${id}-name`} name="name" required minLength={2} maxLength={80} placeholder="etwa: Einstieg Q1" />
      </div>
      <Button type="submit" disabled={laeuft}>
        {laeuft ? 'Wird angelegt …' : 'Lernplan anlegen'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function EintragFormular({ kuerzel, plan }: { kuerzel: string; plan: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(fuegeEintragHinzuAktion.bind(null, kuerzel), LEER);
  const [alle, setAlle] = useState(false);
  const id = useId();
  return (
    <form action={aktion} className="vocab-form org-form">
      <input type="hidden" name="plan" value={plan} />
      <div className="vocab-form-inline org-felder">
        <div className="vocab-field">
          <label htmlFor={`${id}-pfad`}>Pfad</label>
          <select id={`${id}-pfad`} name="pfad" defaultValue="python">
            <option value="python">PythonPfad</option>
            <option value="sql">SQLPfad</option>
            <option value="ai">AIPfad</option>
          </select>
        </div>
        <div className="vocab-field">
          <label htmlFor={`${id}-ziel`}>Ziel: abgeschlossene Lektionen</label>
          <input
            id={`${id}-ziel`}
            name="ziel"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            defaultValue={5}
            disabled={alle}
            required={!alle}
          />
        </div>
        <div className="vocab-field">
          <label htmlFor={`${id}-faellig`}>Fällig bis (optional)</label>
          <input id={`${id}-faellig`} name="faellig" type="date" />
        </div>
      </div>
      <label className="org-check">
        <input type="checkbox" name="alle" checked={alle} onChange={(e) => setAlle(e.currentTarget.checked)} /> Ziel: alle
        Lektionen des Pfads
      </label>
      <div>
        <Button type="submit" disabled={laeuft}>
          {laeuft ? 'Wird hinzugefügt …' : 'Eintrag hinzufügen'}
        </Button>
      </div>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

export function EintragSteuerung({
  kuerzel,
  eintrag,
  erster,
  letzter,
  beschreibung,
}: {
  kuerzel: string;
  eintrag: string;
  erster: boolean;
  letzter: boolean;
  beschreibung: string;
}): React.ReactElement {
  const [verschiebeAntwort, verschiebe, verschiebtLaeuft] = useActionState(verschiebeEintragAktion.bind(null, kuerzel), LEER);
  const [entferneAntwort, entferne, entferntLaeuft] = useActionState(entferneEintragAktion.bind(null, kuerzel), LEER);
  return (
    <div className="org-verwalten">
      <form action={verschiebe} className="org-inline">
        <input type="hidden" name="eintrag" value={eintrag} />
        <Button type="submit" name="richtung" value="hoch" variant="secondary" size="sm" disabled={erster || verschiebtLaeuft} aria-label={`${beschreibung} nach oben`}>
          ↑
        </Button>
        <Button type="submit" name="richtung" value="runter" variant="secondary" size="sm" disabled={letzter || verschiebtLaeuft} aria-label={`${beschreibung} nach unten`}>
          ↓
        </Button>
      </form>
      <form action={entferne} className="org-inline">
        <input type="hidden" name="eintrag" value={eintrag} />
        <Button type="submit" variant="secondary" size="sm" disabled={entferntLaeuft} aria-label={`${beschreibung} entfernen`}>
          {entferntLaeuft ? 'Wird entfernt …' : 'Entfernen'}
        </Button>
      </form>
      <Rueckmeldung antwort={verschiebeAntwort.meldung ? verschiebeAntwort : entferneAntwort} />
    </div>
  );
}

export function PlanLoeschenKnopf({ kuerzel, plan, name }: { kuerzel: string; plan: string; name: string }): React.ReactElement {
  const [antwort, aktion, laeuft] = useActionState(loeschePlanAktion.bind(null, kuerzel), LEER);
  return (
    <form
      action={aktion}
      className="org-inline"
      onSubmit={(e) => {
        if (!window.confirm(`Lernplan „${name}“ löschen? Der Lernstand der Personen bleibt unberührt.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="plan" value={plan} />
      <Button type="submit" variant="secondary" disabled={laeuft}>
        {laeuft ? 'Wird gelöscht …' : 'Lernplan löschen'}
      </Button>
      <Rueckmeldung antwort={antwort} />
    </form>
  );
}

