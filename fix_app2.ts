import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(`    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
      nodes: [...currentAlgo.nodes, newNode],
    });`, `    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
      };
    });`);

content = content.replace(`    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
      nodes: currentAlgo.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    });`, `    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      };
    });`);

content = content.replace(`    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
      nodes: currentAlgo.nodes.map((n) => (n.id === id ? { ...n, width, height } : n)),
    });`, `    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, width, height } : n)),
      };
    });`);

content = content.replace(`    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
      nodes: currentAlgo.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...updated } as FlowNode : n)),
    });`, `    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...updated } as FlowNode : n)),
      };
    });`);

content = content.replace(`    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
      nodes: currentAlgo.nodes.filter((n) => n.id !== selectedNodeId),
      connections: currentAlgo.connections.filter(
        (c) => c.fromId !== selectedNodeId && c.toId !== selectedNodeId
      ),
    });`, `    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== selectedNodeId),
        connections: prev.connections.filter(
          (c) => c.fromId !== selectedNodeId && c.toId !== selectedNodeId
        ),
      };
    });`);

content = content.replace(`    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
      nodes: [...currentAlgo.nodes, newNode],
    });`, `    setCurrentAlgo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
      };
    });`);


fs.writeFileSync('src/App.tsx', content, 'utf-8');
