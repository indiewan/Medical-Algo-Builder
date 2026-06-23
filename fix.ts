import fs from 'fs';

let content = fs.readFileSync('src/templates.ts', 'utf-8');

// Replace all button heights safely by splitting
const parts = content.split(`type: 'button',`);
for (let i = 1; i < parts.length; i++) {
   parts[i] = parts[i].replace(/height: 1(\.5)?,/, 'height: 2,');
}

fs.writeFileSync('src/templates.ts', parts.join(`type: 'button',`), 'utf-8');
console.log('Fixed heights in templates.ts');
