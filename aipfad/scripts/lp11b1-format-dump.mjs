import { readFileSync } from 'node:fs';
const paths = ["docs/TESTING.md","e2e/stage8-offline-tools.spec.ts","src/components/labs/tool-calling-lab.tsx","tests/integration/tool-calling-lab.test.ts","tests/unit/tool-calling-content.test.ts"];
for(const path of paths) process.stdout.write('LP11B1_FORMATTED ' + path + ' ' + readFileSync(path).toString('base64') + '\n');
