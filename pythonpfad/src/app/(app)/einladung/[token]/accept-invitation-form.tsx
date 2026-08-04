'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, Callout } from '@/components/ui/primitives';
import { acceptInvitationAction, type ActionState } from '@/server/actions/organisation-actions';

const INITIAL: ActionState = { ok: false };

export function AcceptInvitationForm({ token }: { token: string }): React.ReactElement {
  const [state, action, pending] = useActionState(acceptInvitationAction, INITIAL);

  if (state.ok) {
    return (
      <Callout tone="success" title="Beigetreten" live>
        <p>{state.message}</p>
        <p className="mt-2">
          <Link href="/organisation" className="text-[var(--accent)] underline">
            Zu deinen Organisationen
          </Link>
        </p>
      </Callout>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Wird eingelöst …' : 'Einladung annehmen'}
      </Button>
      {state.error ? (
        <Callout tone="alert" title="Das hat nicht geklappt" live>
          {state.error}
        </Callout>
      ) : null}
    </form>
  );
}
