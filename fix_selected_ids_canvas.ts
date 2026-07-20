import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

content = content.replace(
  /selectedNodeId: string \| null;/,
  `selectedNodeId: string | null;
  selectedNodeIds?: string[];`
);

content = content.replace(
  /selectedNodeId,/,
  'selectedNodeId,\n  selectedNodeIds = [],'
);

content = content.replace(
  /onSelectNode: \(id: string \| null\) => void;/,
  'onSelectNode: (id: string | null | string[]) => void;'
);

content = content.replace(
  /const \[selectedIds, setSelectedIds\] = useState<Set<string>>\(new Set\(\)\);/,
  `// using selectedNodeIds instead`
);

content = content.replace(
  /useEffect\(\(\) => \{\n\s*if \(selectedNodeId && !selectedIds\.has\(selectedNodeId\)\) \{\n\s*setSelectedIds\(new Set\(\[selectedNodeId\]\)\);\n\s*\} else if \(!selectedNodeId && selectedIds\.size === 1\) \{\n\s*\/\/ if we deselected from outside\n\s*setSelectedIds\(new Set\(\)\);\n\s*\}\n\s*\}, \[selectedNodeId\]\);/g,
  ''
);

content = content.replace(
  /selectedIds/g,
  'new Set(selectedNodeIds)'
);

content = content.replace(
  /setSelectedIds\(newSelectedIds\);/g,
  ''
);

content = content.replace(
  /setSelectedIds\(newSelected\);/g,
  ''
);

content = content.replace(
  /setSelectedIds\(new Set\(\)\);/g,
  ''
);

// We need to pass newSelectedIds to onSelectNode.
content = content.replace(
  /onSelectNode\(newSelectedIds.size > 0 \? \(Array\.from\(newSelectedIds\) as string\[\]\)\[newSelectedIds\.size - 1\] : null\);/,
  'onSelectNode(Array.from(newSelectedIds) as string[]);'
);

content = content.replace(
  /onSelectNode\(Array.from\(newSelected\) as string\[\]\);/g,
  'onSelectNode(Array.from(newSelected) as string[]);'
);

// And we still have newSelectedIds logic inside handlePointerDown
content = content.replace(
  /let newSelectedIds = new Set\(selectedNodeIds\);/,
  'let newSelectedIds = new Set(selectedNodeIds);'
);


fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
