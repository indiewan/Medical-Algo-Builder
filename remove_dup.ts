import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const handleAddNode = \([^\{]+\{[\s\S]*?setSelectedNodeId\(\[newNode\.id\]\);\n  \};\n/,
  '' // Remove duplicate handleAddNode
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
