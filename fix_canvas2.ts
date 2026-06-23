import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

// 1. Update onUpdateNodeCoordinates prop
content = content.replace(
  /onUpdateNodeCoordinates: \(id: string, x: number, y: number\) => void;/,
  'onUpdateNodeCoordinates: (updates: {id: string, x: number, y: number}[] | string, x?: number, y?: number) => void;'
);

// 2. Add marquee states
content = content.replace(
  /const \[draggingId, setDraggingId\] = useState<string \| null>\(null\);/,
  `const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marqueeStart, setMarqueeStart] = useState<{x: number, y: number} | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{x: number, y: number} | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [dragNodesInitialPos, setDragNodesInitialPos] = useState<Map<string, {x: number, y: number}>>(new Map());`
);

// Sync selectedNodeId with selectedIds
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


fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
