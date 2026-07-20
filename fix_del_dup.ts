import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const updatedDeleteNode = `
  const handleDeleteSelectedNode = () => {
    if (selectedNodeIds.length === 0) return;
    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.filter((n) => !selectedNodeIds.includes(n.id)),
        connections: prev.connections.filter(
          (c) => !selectedNodeIds.includes(c.fromId) && !selectedNodeIds.includes(c.toId)
        ),
      };
    });
    setSelectedNodeId(null);
  };
`;

content = content.replace(
  /const handleDeleteSelectedNode = \(\) => \{[\s\S]*?\}\);\n  \};\n/,
  updatedDeleteNode + '\n'
);

const updatedDuplicateNode = `
  // Node duplication from canvas
  const handleDuplicateSelectedNode = () => {
    if (selectedNodeIds.length === 0) return;
    
    const nodesToCopy = currentAlgo.nodes.filter(n => selectedNodeIds.includes(n.id));
    if (nodesToCopy.length === 0) return;

    const idMap = new Map<string, string>();
    const newNodes = nodesToCopy.map(n => {
       const newId = \`node_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`;
       idMap.set(n.id, newId);
       return {
          ...n,
          id: newId,
          x: n.x + 1,
          y: n.y + 1,
       };
    });

    const connsToCopy = currentAlgo.connections.filter(c => selectedNodeIds.includes(c.fromId) && selectedNodeIds.includes(c.toId));
    const newConnections = connsToCopy
      .filter(c => idMap.has(c.fromId) && idMap.has(c.toId))
      .map(c => ({
         ...c,
         id: \`conn_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
         fromId: idMap.get(c.fromId)!,
         toId: idMap.get(c.toId)!
      }));

    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: [...prev.nodes, ...newNodes],
        connections: [...prev.connections, ...newConnections]
      };
    });
    setSelectedNodeId(newNodes.map(n => n.id));
  };
`;

content = content.replace(
  /const handleDuplicateSelectedNode = \(\) => \{[\s\S]*?\}\);\n  \};\n/,
  updatedDuplicateNode + '\n'
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
