import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const \[selectedNodeId, setSelectedNodeId\] = useState<string \| null>\(null\);/,
  `const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeId = selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : null;
  const setSelectedNodeId = (id: string | string[] | null) => {
     if (id === null) setSelectedNodeIds([]);
     else if (typeof id === 'string') setSelectedNodeIds([id]);
     else setSelectedNodeIds(id);
  };`
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
