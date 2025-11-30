const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'server', 'routes.ts');
const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);
let brace = 0, paren = 0, bracket = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '{') brace++;
    if (ch === '}') brace--;
    if (ch === '(') paren++;
    if (ch === ')') paren--;
    if (ch === '[') bracket++;
    if (ch === ']') bracket--;
    if (brace < 0 || paren < 0 || bracket < 0) {
      console.log(`Unbalanced closing at line ${i+1}, char ${j+1}:`, { brace, paren, bracket, line: line.trim() });
      process.exit(1);
    }
  }
}
console.log('Final counts:', { brace, paren, bracket });
if (brace !== 0 || paren !== 0 || bracket !== 0) process.exit(2);
console.log('Balance appears OK');
