import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const updatedCopyPaste = `
  // Copy / Paste / Delete via Keyboard
  const [clipboardNodes, setClipboardNodes] = useState<FlowNode[]>([]);
  const [clipboardConnections, setClipboardConnections] = useState<FlowConnection[]>([]);

  useEffect(() => {
    if (!isEditMode || isSharedResource) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
         return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
         updateAlgoWithHistory(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => !selectedNodeIds.includes(n.id)),
            connections: prev.connections.filter(c => !selectedNodeIds.includes(c.fromId) && !selectedNodeIds.includes(c.toId))
         }));
         setSelectedNodeId(null);
      }

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
         if (selectedNodeIds.length > 0) {
            const nodesToCopy = currentAlgo.nodes.filter(n => selectedNodeIds.includes(n.id));
            setClipboardNodes(nodesToCopy);
            
            // Also copy connections between these nodes
            const connsToCopy = currentAlgo.connections.filter(c => selectedNodeIds.includes(c.fromId) && selectedNodeIds.includes(c.toId));
            setClipboardConnections(connsToCopy);
         }
      }

      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
         if (clipboardNodes.length > 0) {
            // Find centroid to offset by grid cells safely
            const minX = Math.min(...clipboardNodes.map(n => n.x));
            const minY = Math.min(...clipboardNodes.map(n => n.y));
            
            // Offset logic (move down right by 1 cell, wrap if out of bounds)
            const idMap = new Map<string, string>();
            const newNodes = clipboardNodes.map(n => {
               const newId = \`node_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`;
               idMap.set(n.id, newId);
               return {
                  ...n,
                  id: newId,
                  x: n.x + 1,
                  y: n.y + 1,
               };
            });
            
            const newConnections = clipboardConnections
              .filter(c => idMap.has(c.fromId) && idMap.has(c.toId))
              .map(c => ({
                 ...c,
                 id: \`conn_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
                 fromId: idMap.get(c.fromId)!,
                 toId: idMap.get(c.toId)!
              }));

            updateAlgoWithHistory(prev => ({
               ...prev,
               nodes: [...prev.nodes, ...newNodes],
               connections: [...prev.connections, ...newConnections]
            }));

            setSelectedNodeId(newNodes.map(n => n.id));
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, isSharedResource, selectedNodeIds, currentAlgo, clipboardNodes, clipboardConnections]);
`;

content = content.replace(
  /\/\/ Copy \/ Paste \/ Delete via Keyboard[\s\S]*?(?=const handleDeleteSelectedNode = \(\) => \{)/,
  updatedCopyPaste + '\n  '
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
