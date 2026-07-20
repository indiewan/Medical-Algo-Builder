import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /setCurrentAlgo\(\(prev\) => \{\n\s*if \(\!prev\) return prev;\n\s*return \{\n\s*\.\.\.prev,\n\s*nodes: \[\.\.\.prev\.nodes, newNode\],\n\s*\};\n\s*\}\);/,
  `updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
      };
    });`
);

// also handle setSelectedNodeId to array in original handleAddNode
content = content.replace(
  /setSelectedNodeId\(newNode\.id\);/g,
  'setSelectedNodeId([newNode.id]);'
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
