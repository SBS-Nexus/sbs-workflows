import { readFileSync } from 'node:fs';
process.stdout.write('P3_SHELL_FORMATTED ' + readFileSync('e2e/shell-navigation.spec.ts').toString('base64') + '\n');
