import fs from 'fs';

let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

// Replace handlePointerDown, Move, Up
const handlersStart = content.indexOf('const handlePointerDown = (');
const handlersEnd = content.indexOf('const handleResizeStart =');
if (handlersStart === -1 || handlersEnd === -1) process.exit(1);

const replacementHandlers = `
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (!isEditMode) return;
    if (linkOriginId) return; // Linking tool takes precedence

    e.stopPropagation();
    
    let newSelectedIds = selectedIds;
    // Highlight dragging selection
    if (!e.shiftKey && !selectedIds.has(node.id)) {
      newSelectedIds = new Set([node.id]);
      setSelectedIds(newSelectedIds);
      onSelectNode(node.id);
    } else if (e.shiftKey) {
      newSelectedIds = new Set(selectedIds);
      if (newSelectedIds.has(node.id)) newSelectedIds.delete(node.id);
      else newSelectedIds.add(node.id);
      setSelectedIds(newSelectedIds);
      onSelectNode(newSelectedIds.size > 0 ? Array.from(newSelectedIds)[newSelectedIds.size - 1] : null);
    }

    const container = containerRef.current;
    if (!container) return;

    // Start dragging
    setDraggingId(node.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);

    const initials = new Map();
    nodes.forEach(n => {
       if (newSelectedIds.has(n.id)) {
          initials.set(n.id, { x: n.x, y: n.y });
       }
    });
    setDragNodesInitialPos(initials);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (draggingId !== node.id || !dragStartPos) return;

    const deltaXBlocks = (e.clientX - dragStartPos.x) / zoom / CELL_WIDTH;
    const deltaYBlocks = (e.clientY - dragStartPos.y) / zoom / CELL_HEIGHT;
    
    // We store the pointer delta visually using dragPos for rerenders.
    setDragPos({ x: deltaXBlocks, y: deltaYBlocks });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (draggingId !== node.id) return;
    
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);

    const deltaXBlocks = (e.clientX - dragStartPos!.x) / zoom / CELL_WIDTH;
    const deltaYBlocks = (e.clientY - dragStartPos!.y) / zoom / CELL_HEIGHT;

    const updates = Array.from(dragNodesInitialPos.entries()).map(([nId, initPos]) => {
      // Snapping block pos to exact 0.5 increments for subtle snapping or exactly what dragging suggests
      // Since zoom and grid are involved, no magnetic snap is used, just direct placement.
      // But we prevent going out of bounds
      const targetN = nodes.find(n => n.id === nId);
      let nx = initPos.x + deltaXBlocks;
      let ny = initPos.y + deltaYBlocks;
      if (targetN) {
         nx = Math.max(0, Math.min(GRID_COLS - targetN.width, nx));
         ny = Math.max(0, Math.min(GRID_ROWS - targetN.height, ny));
      }
      return { id: nId, x: nx, y: ny };
    });

    if (updates.length > 0) {
      onUpdateNodeCoordinates(updates as any);
    }
    
    setDragNodesInitialPos(new Map());
    setDragPos({x: 0, y: 0});
  };

  `;

content = content.substring(0, handlersStart) + replacementHandlers + content.substring(handlersEnd);

// Add marquee handlers to SVG grid layer
content = content.replace(
  /<svg className="absolute inset-0 w-full h-full pointer-events-none z-10">/,
  `{marqueeStart && marqueeCurrent && (
        <div 
           className="absolute border-2 border-blue-500 bg-blue-500/20 z-40 pointer-events-none"
           style={{
             left: \`\${Math.min(marqueeStart.x, marqueeCurrent.x)}px\`,
             top: \`\${Math.min(marqueeStart.y, marqueeCurrent.y)}px\`,
             width: \`\${Math.abs(marqueeCurrent.x - marqueeStart.x)}px\`,
             height: \`\${Math.abs(marqueeCurrent.y - marqueeStart.y)}px\`,
           }}
        />
      )}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">`
);

// We need an onPointerDown for the Container to start marquee.
content = content.replace(
  /onClick=\{\(\) => onSelectNode\(null\)\}/,
  `onPointerDown={(e) => {
          if (!isEditMode) { onSelectNode(null); return; }
          if (e.target === containerRef.current) {
            const rect = containerRef.current!.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            setMarqueeStart({ x, y });
            setMarqueeCurrent({ x, y });
            e.currentTarget.setPointerCapture(e.pointerId);
            if (!e.shiftKey) { setSelectedIds(new Set()); onSelectNode(null); }
          }
        }}
        onPointerMove={(e) => {
          if (marqueeStart) {
            const rect = containerRef.current!.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            setMarqueeCurrent({ x, y });
          }
        }}
        onPointerUp={(e) => {
          if (marqueeStart && marqueeCurrent) {
            // Find nodes inside marquee
            const rectX = Math.min(marqueeStart.x, marqueeCurrent.x);
            const rectY = Math.min(marqueeStart.y, marqueeCurrent.y);
            const rectW = Math.abs(marqueeCurrent.x - marqueeStart.x);
            const rectH = Math.abs(marqueeCurrent.y - marqueeStart.y);
            
            const newSelected = new Set(e.shiftKey ? selectedIds : []);
            nodes.forEach(n => {
              const nx = n.x * CELL_WIDTH;
              const ny = n.y * CELL_HEIGHT;
              const nw = n.width * CELL_WIDTH;
              const nh = n.height * CELL_HEIGHT;
              // Simple intersection
              if (nx < rectX + rectW && nx + nw > rectX && ny < rectY + rectH && ny + nh > rectY) {
                newSelected.add(n.id);
              }
            });
            setSelectedIds(newSelected);
            if (newSelected.size > 0) onSelectNode(Array.from(newSelected)[newSelected.size - 1]);
            
            setMarqueeStart(null);
            setMarqueeCurrent(null);
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}`
);

// We must also fix how node position is calculated during render since dragPos is now a delta!
content = content.replace(
  /const leftPx = isDragging \? dragPos\.x : node\.x \* CELL_WIDTH \+ 10;\n\s*const topPx = isDragging \? dragPos\.y : node\.y \* CELL_HEIGHT \+ 8;/,
  `const isMultiDragging = draggingId !== null && selectedIds.has(node.id);
          const leftPx = isMultiDragging ? (dragNodesInitialPos.get(node.id)?.x! + dragPos.x) * CELL_WIDTH + 10 : node.x * CELL_WIDTH + 10;
          const topPx = isMultiDragging ? (dragNodesInitialPos.get(node.id)?.y! + dragPos.y) * CELL_HEIGHT + 8 : node.y * CELL_HEIGHT + 8;`
);

fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
