import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const missingFunctions = `
  const handleAddNode = (type: FlowNode['type']) => {
    const newNode: FlowNode = {
      id: \`node_\${Date.now()}\`,
      type,
      label: type === 'action' ? 'New Action' : type === 'assessment' ? 'New Assessment' : type === 'decision' ? 'Decision' : 'Details',
      x: 5,
      y: 5,
      width: type === 'table' ? 12 : 5,
      height: type === 'table' ? 6 : type === 'annotation' ? 2 : 3,
      color: type === 'action' ? 'emerald' : type === 'decision' ? 'amber' : 'slate',
      inputType: type === 'input' ? 'text' : undefined,
      tableHeaders: type === 'table' ? ['Action', 'Time'] : undefined,
      tableRows: type === 'table' ? [['', ''], ['', '']] : undefined,
    };

    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
      };
    });
    setSelectedNodeId([newNode.id]);
  };

  const handleUpdateNodeCoordinates = (idOrUpdates: string | {id: string, x: number, y: number}[], x?: number, y?: number) => {
    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (Array.isArray(idOrUpdates)) {
            const update = idOrUpdates.find(u => u.id === n.id);
            return update ? { ...n, x: update.x, y: update.y } : n;
          } else {
            return n.id === idOrUpdates ? { ...n, x: x!, y: y! } : n;
          }
        }),
      };
    });
  };

  const handleUpdateNodeDimensions = (id: string, width: number, height: number) => {
    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, width, height } : n)),
      };
    });
  };

  const handleUpdateSelectedNode = (updated: Partial<FlowNode>) => {
    if (!selectedNodeId) return;
    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...updated } as FlowNode : n)),
      };
    });
  };

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
  /\/\/ Node adding logic handler\n\s*const handleStartTrackingModeLink/,
  missingFunctions + '\n  const handleStartTrackingModeLink'
);

// We also need to remove those other duplicate handleUpdateConnection and handleDeleteSelectedNode that might be floating around.
// Well, I see I already had a duplicate `handleUpdateConnection` and `handleDeleteSelectedNode` from my previous edits in the view file output!
// Wait, view file 282: had `handleDeleteSelectedNode` but it only returned setSelectedNodeId(null) apparently? Yes.
// Let me just replace the entire content between `// Node adding logic handler` and `// Load a medical algorithm scenario template` to cleanly restore it!

const sectionToReplace = content.substring(
  content.indexOf('// Node adding logic handler'),
  content.indexOf('// Load a medical algorithm scenario template')
);

const cleanlyRestoredSection = `// Node adding logic handler
` + missingFunctions + `
  const handleStartTrackingModeLink = (id: string) => {
    setLinkOriginId(id);
  };

  const handleCompleteLink = (targetId: string) => {
    if (!linkOriginId || linkOriginId === targetId) {
      setLinkOriginId(null);
      return;
    }

    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      
      const exists = prev.connections.some(
        (c) => c.fromId === linkOriginId && c.toId === targetId
      );
      if (exists) return prev; // Avoid duplicate connections

      const newConn: FlowConnection = {
        id: \`conn_\${Date.now()}\`,
        fromId: linkOriginId,
        toId: targetId,
      };

      return {
        ...prev,
        connections: [...prev.connections, newConn],
      };
    });
    
    setLinkOriginId(null);
  };

  const handleDeleteConnection = (connId: string) => {
    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        connections: prev.connections.filter((c) => c.id !== connId),
      };
    });
  };

  const handleUpdateConnection = (connId: string, updates: Partial<FlowConnection>) => {
    updateAlgoWithHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        connections: prev.connections.map((c) => 
          c.id === connId ? { ...c, ...updates } : c
        ),
      };
    });
  };

  `;

content = content.replace(sectionToReplace, cleanlyRestoredSection);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
