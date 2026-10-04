import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { VocabApp } from '@/components/vocabulary/vocab-app';

export const metadata: Metadata = {
  title: 'VokabelPfad',
  description:
    'Englisch ↔ Deutsch mit eigenen Decks, beiden Lernrichtungen und täglicher Wiederholung. Gespeichert nur in deinem Browser.',
};

export default function VocabularyPage(): React.ReactElement {
  return (
    <>
      <SiteHeader current="vokabeln" />
      <main id="hauptinhalt" className="shell vocab-page">
        <VocabApp />
      </main>
    </>
  );
}
