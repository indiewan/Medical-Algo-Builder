import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /selectedNodeId=\{selectedNodeId\}/g,
  'selectedNodeId={selectedNodeId}\n            selectedNodeIds={selectedNodeIds}'
);

content = content.replace(
  /onSelectNode=\{setSelectedNodeId\}/,
  'onSelectNode={setSelectedNodeId}' // wait, it's correct
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
