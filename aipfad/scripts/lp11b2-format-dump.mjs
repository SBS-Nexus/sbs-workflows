import { readFileSync } from 'node:fs';
const paths = ["docs/CONTENT-POLICY.md","docs/LEHRPLAN.md","docs/QUELLEN.md","docs/TESTING.md","src/app/labs/[slug]/page.tsx","src/components/labs/tool-calling-lab.tsx","src/content/modules/structured-tools.ts","src/domain/tool-calling/vertrag.ts","tests/unit/tool-calling-vertrag.test.ts"];
for (const path of paths) process.stdout.write('LP11B2_FORMATTED ' + path + ' ' + readFileSync(path).toString('base64') + '\n');
