import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replaceAll('\\${', '${');
content = content.replaceAll('\\`', '`');

fs.writeFileSync('src/App.tsx', content, 'utf-8');
