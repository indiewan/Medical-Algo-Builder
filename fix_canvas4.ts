import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

// The replacement of useState failed.
content = content.replace(
  /const \[draggingId, setDraggingId\] = useState<string \| null>\(null\);/,
  `const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marqueeStart, setMarqueeStart] = useState<{x: number, y: number} | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{x: number, y: number} | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [dragNodesInitialPos, setDragNodesInitialPos] = useState<Map<string, {x: number, y: number}>>(new Map());`
);

content = content.replace(
  /useEffect\(\(\) => \{\n\s*\/\/ Refresh on layout prop changes if any\n\s*\}, \[\]\);/,
  `useEffect(() => {
    // Refresh on layout prop changes if any
  }, []);

  useEffect(() => {
    if (selectedNodeId && !selectedIds.has(selectedNodeId)) {
       setSelectedIds(new Set([selectedNodeId]));
    } else if (!selectedNodeId && selectedIds.size === 1) {
       // if we deselected from outside
       setSelectedIds(new Set());
    }
  }, [selectedNodeId]);`
);


// Replace isSelected references inside mapping nodes
// Find: const isSelected = selectedNodeId === node.id;
content = content.replace(
  /const isSelected = selectedNodeId === node\.id;/g,
  `const isSelected = selectedIds.has(node.id);`
);


fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
