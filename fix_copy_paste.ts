import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const copyPasteEffect = `
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

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
         handleDeleteSelectedNode();
      }

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
         // Copy selected node (or multiple if we supported it, but we only have selectedNodeId here)
         // Wait, we need to get the actual node and maybe connections
         if (selectedNodeId) {
            const node = currentAlgo.nodes.find(n => n.id === selectedNodeId);
            if (node) {
               setClipboardNodes([node]);
               // We could also copy connections between selected nodes if multiple were selected.
               setClipboardConnections([]);
            }
         }
      }

      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
         // Paste
         if (clipboardNodes.length > 0) {
            // Give them new IDs and offset slightly
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
            
            // Re-map connections if any
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

            // Select the newly pasted node
            if (newNodes.length === 1) {
               setSelectedNodeId(newNodes[0].id);
            }
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, isSharedResource, selectedNodeId, currentAlgo, clipboardNodes, clipboardConnections]);
`;

content = content.replace(
  /const handleDeleteSelectedNode = \(\) => \{/,
  copyPasteEffect + '\n  const handleDeleteSelectedNode = () => {'
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
