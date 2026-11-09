import { readFileSync } from 'node:fs';
const paths = ["e2e/stage8-offline-tools.spec.ts","src/components/labs/tool-calling-lab.tsx","src/content/concepts.ts","src/content/labs.ts","src/content/modules/structured-tools.ts","src/domain/labs/tool-calling-config.ts","src/domain/tool-calling/vertrag.ts","tests/unit/tool-calling-content.test.ts","tests/unit/tool-calling-vertrag.test.ts"];
for (const path of paths) {
  const encoded = readFileSync(path).toString('base64');
  process.stdout.write('LP11A_FORMATTED ' + path + ' ' + encoded + '\n');
}
