import type { CourseDraft } from '@/domain/content/schema';
import { orientierungModule } from './modules/orientierung';
import { arbeitsplatzModule } from './modules/arbeitsplatz';
import { llmGrundlagenModule } from './modules/llm-grundlagen';
import { promptingModule } from './modules/prompting';
import { gitGrundlagenModule } from './modules/git-grundlagen';
import { gitZusammenarbeitModule } from './modules/git-zusammenarbeit';
import { embeddingsRetrievalModule } from './modules/embeddings-retrieval';
import { ragModule } from './modules/rag';
import { structuredToolsModule } from './modules/structured-tools';

export const course: CourseDraft = {
  slug: 'aipfad-grundlagen',
  title: 'AIPfad Grundlagen',
  description:
    'Der Einstieg in AIPfad: Orientierung, technischer Arbeitsplatz, LLM-Grundlagen, Prompting, Git und GitHub, Embeddings und semantische Suche sowie RAG und Offline-Grundlagen für JSON und Tool-Calling. Der vollständige Lehrplan geht weit darüber hinaus — siehe docs/LEHRPLAN.md.',
  version: '1.0.0',
  modules: [
    orientierungModule,
    arbeitsplatzModule,
    llmGrundlagenModule,
    promptingModule,
    gitGrundlagenModule,
    gitZusammenarbeitModule,
    embeddingsRetrievalModule,
    ragModule,
    structuredToolsModule,
  ],
};
