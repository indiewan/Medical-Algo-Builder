const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The original file contains literal '\${' which should be '${'
content = content.replace(/\\\$\\{/g, '${');
content = content.replace(/\\\\`/g, '`');

fs.writeFileSync('src/App.tsx', content, 'utf-8');
