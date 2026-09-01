import type { CourseDraft } from '@/domain/content/schema';
import { orientierungModule } from './modules/orientierung';
import { arbeitsplatzModule } from './modules/arbeitsplatz';
import { llmGrundlagenModule } from './modules/llm-grundlagen';
import { promptingModule } from './modules/prompting';

export const course: CourseDraft = {
  slug: 'aipfad-grundlagen',
  title: 'AIPfad Grundlagen',
  description:
    'Der Einstieg in AIPfad: Orientierung, technischer Arbeitsplatz, LLM-Grundlagen und die ersten Schritte im Prompting. Der vollständige Lehrplan geht weit darüber hinaus — siehe docs/LEHRPLAN.md.',
  version: '1.0.0',
  modules: [orientierungModule, arbeitsplatzModule, llmGrundlagenModule, promptingModule],
};
