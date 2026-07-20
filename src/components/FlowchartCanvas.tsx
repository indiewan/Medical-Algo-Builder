/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { FlowNode, FlowConnection } from '../types.ts';

// Dynamic Lucide icon helper
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  if (!name || name === 'None') return null;
  if (name === 'LetterA') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 20 7-16 7 16"/><path d="m8 14 h8"/></svg>;
  if (name === 'LetterB') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>;
  if (name === 'LetterC') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 1 0 0 6"/></svg>;
  if (name === 'LetterD') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a8 8 0 0 1 8 8 8 8 0 0 1-8 8H6z"/></svg>;
  if (name === 'LetterE') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 4H6v16h12"/><path d="M6 12h10"/></svg>;
  if (name === 'O2Mask') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8v3c0 1.5 2 3 6 3s6-1.5 6-3V8"/><path d="M12 14v7"/><path d="M8 21h8"/><path d="M4 10l-1.5-1.5"/><path d="M20 10l1.5-1.5"/></svg>;

  const LucideIcon = (Icons as any)[name] || Icons.HelpCircle;
  return <LucideIcon className={className || "w-5 h-5"} />;
};

interface FlowchartCanvasProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  isEditMode: boolean;
  isSharedResource: boolean;
  isIncidentActive: boolean;
  searchQuery?: string;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  linkOriginId: string | null; // For connecting nodes together
  onSelectNode: (id: string | null | string[]) => void;
  onUpdateNodeCoordinates: (updates: {id: string, x: number, y: number}[] | string, x?: number, y?: number) => void;
  onUpdateNodeDimensions?: (id: string, width: number, height: number) => void;
  onNodeClickInTracking: (node: FlowNode) => void;
  onDataLog?: (labelPrefix: string, value: string) => void;
  onStartTrackingModeLink: (id: string) => void;
  onCompleteLink: (targetId: string) => void;
  onDeleteConnection: (connId: string) => void;
  activeTimers: { [nodeId: string]: { lastPressedAt: number; counter: string; isExpired?: boolean } };
  activeToggles: Record<string, boolean>;
}

// Fixed dimensions for grid cells in pixels
const CELL_WIDTH = 100;
const CELL_HEIGHT = 60;
const GRID_COLS = 36;
const GRID_ROWS = 48;

export default function FlowchartCanvas({
  nodes,
  connections,
  isEditMode,
  isSharedResource,
  isIncidentActive,
  searchQuery,
  selectedNodeId,
  selectedNodeIds = [],
  linkOriginId,
  onSelectNode,
  onUpdateNodeCoordinates,
  onUpdateNodeDimensions,
  onNodeClickInTracking,
  onDataLog,
  onStartTrackingModeLink,
  onCompleteLink,
  onDeleteConnection,
  activeTimers,
  activeToggles,
}: FlowchartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panningStartPos = useRef({ x: 0, y: 0 });
  const panningScrollStart = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // using selectedNodeIds instead
  const [marqueeStart, setMarqueeStart] = useState<{x: number, y: number} | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{x: number, y: number} | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [dragNodesInitialPos, setDragNodesInitialPos] = useState<Map<string, {x: number, y: number}>>(new Map());
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 }); // Current mouse/pointer position relative to canvas

  // Resizing state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartDims, setResizeStartDims] = useState({ width: 0, height: 0 });
  const [resizeCurrentPos, setResizeCurrentPos] = useState({ x: 0, y: 0 });

  // Handle snapping calculation
  const getSnapCoords = (pixelsX: number, pixelsY: number, sizeC: number, sizeR: number) => {
    let x = pixelsX / CELL_WIDTH;
    let y = pixelsY / CELL_HEIGHT;
    // Boundary check
    x = Math.max(0, Math.min(GRID_COLS - sizeC, x));
    y = Math.max(0, Math.min(GRID_ROWS - sizeR, y));
    return { x, y };
  };

  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (!isEditMode) return;
    if (linkOriginId) return; // Linking tool takes precedence

    e.stopPropagation();
    
    let newSelectedIds = new Set(selectedNodeIds);
    // Highlight dragging selection
    if (!e.shiftKey && !new Set(selectedNodeIds).has(node.id)) {
      newSelectedIds = new Set([node.id]);
      
      onSelectNode(node.id);
    } else if (e.shiftKey) {
      newSelectedIds = new Set(new Set(selectedNodeIds));
      if (newSelectedIds.has(node.id)) newSelectedIds.delete(node.id);
      else newSelectedIds.add(node.id);
      
      onSelectNode(Array.from(newSelectedIds) as string[]);
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

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    e.stopPropagation();
    setResizingId(node.id);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeCurrentPos({ x: e.clientX, y: e.clientY });
    setResizeStartDims({ width: node.width, height: node.height });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (resizingId !== node.id) return;
    e.stopPropagation();
    setResizeCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (resizingId !== node.id) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const deltaX = (resizeCurrentPos.x - resizeStartPos.x) / zoom;
    const deltaY = (resizeCurrentPos.y - resizeStartPos.y) / zoom;
    const deltaW = Math.round((deltaX / CELL_WIDTH) * 4) / 4;
    const deltaH = Math.round((deltaY / CELL_HEIGHT) * 4) / 4;
    const newW = Math.max(0.5, Math.min(24, resizeStartDims.width + deltaW));
    const newH = Math.max(0.5, Math.min(24, resizeStartDims.height + deltaH));
    
    if (onUpdateNodeDimensions) onUpdateNodeDimensions(node.id, newW, newH);
    setResizingId(null);
  };

  // Helper to find the center/ports of a node for rendering connections
  const getNodePorts = (node: FlowNode) => {
    // Return relative center metrics in pixels
    const widthPx = node.width * CELL_WIDTH - 20; // accounting for padding/margins
    const heightPx = node.height * CELL_HEIGHT - 16;
    const leftPx = node.x * CELL_WIDTH + 10;
    const topPx = node.y * CELL_HEIGHT + 8;

    return {
      id: node.id,
      center: { x: leftPx + widthPx / 2, y: topPx + heightPx / 2 },
      top: { x: leftPx + widthPx / 2, y: topPx },
      bottom: { x: leftPx + widthPx / 2, y: topPx + heightPx },
      left: { x: leftPx, y: topPx + heightPx / 2 },
      right: { x: leftPx + widthPx, y: topPx + heightPx / 2 },
      rect: { left: leftPx, top: topPx, right: leftPx + widthPx, bottom: topPx + heightPx }
    };
  };

  // Calculate coordinates to draw line with arrows nicely avoiding overlapping
  
  const generateOrthogonalPath = (start: {x: number, y: number}, end: {x: number, y: number}, isHorizontal: boolean) => {
    const r = 16;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) < r * 2 || Math.abs(dy) < r * 2) {
      if (isHorizontal) {
        return `M ${start.x} ${start.y} L ${start.x + dx/2} ${start.y} L ${start.x + dx/2} ${end.y} L ${end.x} ${end.y}`;
      } else {
        return `M ${start.x} ${start.y} L ${start.x} ${start.y + dy/2} L ${end.x} ${start.y + dy/2} L ${end.x} ${end.y}`;
      }
    }

    const dirX = Math.sign(dx);
    const dirY = Math.sign(dy);

    if (isHorizontal) {
      const midX = start.x + dx / 2;
      return `M ${start.x} ${start.y} L ${midX - r*dirX} ${start.y} Q ${midX} ${start.y} ${midX} ${start.y + r*dirY} L ${midX} ${end.y - r*dirY} Q ${midX} ${end.y} ${midX + r*dirX} ${end.y} L ${end.x} ${end.y}`;
    } else {
      const midY = start.y + dy / 2;
      return `M ${start.x} ${start.y} L ${start.x} ${midY - r*dirY} Q ${start.x} ${midY} ${start.x + r*dirX} ${midY} L ${end.x - r*dirX} ${midY} Q ${end.x} ${midY} ${end.x} ${midY + r*dirY} L ${end.x} ${end.y}`;
    }
  };

  const calculateConnectionLine = (fromNode: FlowNode, toNode: FlowNode) => {
    const fromPorts = getNodePorts(fromNode);
    const toPorts = getNodePorts(toNode);

    // Direct center-to-center vector to see which sides face each other
    const dx = toPorts.center.x - fromPorts.center.x;
    const dy = toPorts.center.y - fromPorts.center.y;

    let start = fromPorts.bottom;
    let end = toPorts.top;
    let isHorizontal = false;

    if (Math.abs(dx) > Math.abs(dy)) {
      isHorizontal = true;
      // Horizontal flow
      if (dx > 0) {
        start = fromPorts.right;
        end = toPorts.left;
      } else {
        start = fromPorts.left;
        end = toPorts.right;
      }
    } else {
      // Vertical flow
      if (dy > 0) {
        start = fromPorts.bottom;
        end = toPorts.top;
      } else {
        start = fromPorts.top;
        end = toPorts.bottom;
      }
    }

    return { start, end, isHorizontal };
  };

  // Preset node colors mapping for premium styling lookup
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-950 border-emerald-500 hover:border-emerald-600 focus:ring-emerald-500 ',
    amber: 'bg-amber-100 text-amber-950 border-amber-500 hover:border-amber-600 focus:ring-amber-500 ',
    rose: 'bg-rose-100 text-rose-950 border-rose-500 hover:border-rose-600 focus:ring-rose-500 ',
    sky: 'bg-sky-100 text-sky-950 border-sky-500 hover:border-sky-600 focus:ring-sky-500 ',
    indigo: 'bg-indigo-100 text-indigo-950 border-indigo-500 hover:border-indigo-600 focus:ring-indigo-500 ',
    violet: 'bg-violet-100 text-violet-950 border-violet-500 hover:border-violet-600 focus:ring-violet-500 ',
    slate: 'bg-slate-100 text-slate-900 border-slate-400 hover:border-slate-500 focus:ring-slate-400 ',
  };

  const trackingDimOverlay = !isEditMode && !isIncidentActive;

  return (
    <div id="canvas-scroll-container" ref={scrollContainerRef} className={`flex-1 overflow-auto ${isPanning ? "cursor-grabbing" : ""} bg-white rounded-2xl border border-slate-200 shadow-sm relative min-h-[500px]`}
  onPointerDown={e => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.stopPropagation();
      e.preventDefault();
      setIsPanning(true);
      panningStartPos.current = { x: e.clientX, y: e.clientY };
      panningScrollStart.current = { x: scrollContainerRef.current?.scrollLeft || 0, y: scrollContainerRef.current?.scrollTop || 0 };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }}
  onPointerMove={e => {
    if (isPanning && scrollContainerRef.current) {
      e.stopPropagation();
      e.preventDefault();
      const dx = e.clientX - panningStartPos.current.x;
      const dy = e.clientY - panningStartPos.current.y;
      scrollContainerRef.current.scrollLeft = panningScrollStart.current.x - dx;
      scrollContainerRef.current.scrollTop = panningScrollStart.current.y - dy;
    }
  }}
  onPointerUp={e => {
    if (isPanning) {
      e.stopPropagation();
      e.preventDefault();
      setIsPanning(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }}
  onContextMenu={e => {
    if (e.button === 2) {
       e.preventDefault(); // allow right mouse pan
    }
  }}
  >
      <div className="absolute top-4 right-4 z-40 flex gap-2 bg-white/90 backdrop-blur shadow-sm p-1.5 rounded-xl border border-slate-200">
        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer" title="Zoom Out"><Icons.ZoomOut className="w-4 h-4" /></button>
        <span className="text-xs font-medium w-9 text-center my-auto text-slate-500">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer" title="Zoom In"><Icons.ZoomIn className="w-4 h-4" /></button>
      </div>
      <div style={{ width: GRID_COLS * CELL_WIDTH * zoom, height: GRID_ROWS * CELL_HEIGHT * zoom, position: "relative", minWidth: "100%", minHeight: "100%" }}>
      
      {/* Dim overlay showing before start is pressed under Tracking Mode */}
      {trackingDimOverlay && (
        <div className="absolute inset-0 z-30 bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center pointer-events-auto select-none no-print transition-all duration-500">
          <div className="text-center p-8 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl max-w-sm transition-transform duration-500">
            <Icons.PlayCircle className="w-12 h-12 text-blue-600 mx-auto mb-3 animate-pulse" />
            <h3 className="font-display font-bold text-lg text-slate-900">Algorithm Standing By</h3>
            <p className="text-sm text-slate-600 mt-2">
              Review the protocol outline. Click <span className="font-semibold text-emerald-600">Start Incident</span> above to activate workflow tracking.
            </p>
          </div>
        </div>
      )}

      {/* Main Canvas Component containing surgical layout elements */}
      <div
        id="flowchart-canvas-container"
        ref={containerRef}
        className={`w-[2160px] h-[1120px] ${isEditMode ? 'bento-dot-grid' : ''} bg-slate-50/50 relative select-none transition-colors duration-500`}
        style={{
          width: `${GRID_COLS * CELL_WIDTH}px`,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
          height: `${GRID_ROWS * CELL_HEIGHT}px`,
        }}
        onPointerDown={(e) => {
          if (!isEditMode) { onSelectNode(null); return; }
          if (e.target === containerRef.current) {
            const rect = containerRef.current!.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            setMarqueeStart({ x, y });
            setMarqueeCurrent({ x, y });
            e.currentTarget.setPointerCapture(e.pointerId);
            if (!e.shiftKey) {  onSelectNode(null); }
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
            
            const newSelected = new Set(e.shiftKey ? new Set(selectedNodeIds) : []);
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
            
            if (newSelected.size > 0) onSelectNode((Array.from(newSelected) as string[])[newSelected.size - 1]);
            
            setMarqueeStart(null);
            setMarqueeCurrent(null);
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
      >
        {/* Dynamic connection paths lines layer */}
        {marqueeStart && marqueeCurrent && (
        <div 
           className="absolute border-2 border-blue-500 bg-blue-500/20 z-40 pointer-events-none"
           style={{
             left: `${Math.min(marqueeStart.x, marqueeCurrent.x)}px`,
             top: `${Math.min(marqueeStart.y, marqueeCurrent.y)}px`,
             width: `${Math.abs(marqueeCurrent.x - marqueeStart.x)}px`,
             height: `${Math.abs(marqueeCurrent.y - marqueeStart.y)}px`,
           }}
        />
      )}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
            </marker>
          </defs>

          {connections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.fromId);
            const toNode = nodes.find((n) => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            const { start, end, isHorizontal } = calculateConnectionLine(fromNode, toNode);
            const isSelected = selectedNodeId === fromNode.id || selectedNodeId === toNode.id;

            let pathD = generateOrthogonalPath(start, end, isHorizontal);

            return (
              <React.Fragment key={conn.id}>
                {/* Visual Connection line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? '#10b981' : '#64748b'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={fromNode.type === 'annotation' || conn.isDashed ? '4,4' : 'none'}
                  markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                  opacity="0.85"
                />
                
                {/* Deletion handle on hover/select connection */}
                {isEditMode && isSelected && (
                  <circle
                    cx={(start.x + end.x) / 2}
                    cy={(start.y + end.y) / 2}
                    r="9"
                    fill="#ef4444"
                    className="cursor-pointer pointer-events-auto shadow-xs active:bg-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConnection(conn.id);
                    }}
                    title="Delete connection arrow"
                  />
                )}
                {isEditMode && isSelected && (
                  <text
                    x={(start.x + end.x) / 2}
                    y={(start.y + end.y) / 2 + 3}
                    fill="#ffffff"
                    fontSize="9px"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="cursor-pointer pointer-events-none"
                  >
                    ×
                  </text>
                )}
              </React.Fragment>
            );
          })}
        </svg>

        {/* Placing Flowchart Nodes cards on grid positions */}
        {nodes
          .slice()
          .sort((a, b) => (a.type === 'panel' ? -1 : b.type === 'panel' ? 1 : 0))
          .map((node) => {
          const isDragging = draggingId === node.id;
          const isMultiDragging = draggingId !== null && new Set(selectedNodeIds).has(node.id);
          const leftPx = isMultiDragging ? (dragNodesInitialPos.get(node.id)?.x! + dragPos.x) * CELL_WIDTH + 10 : node.x * CELL_WIDTH + 10;
          const topPx = isMultiDragging ? (dragNodesInitialPos.get(node.id)?.y! + dragPos.y) * CELL_HEIGHT + 8 : node.y * CELL_HEIGHT + 8;
          const isResizing = resizingId === node.id;
          let activeWidth = node.width;
          let activeHeight = node.height;
          if (isResizing) {
             const deltaX = (resizeCurrentPos.x - resizeStartPos.x) / zoom;
             const deltaY = (resizeCurrentPos.y - resizeStartPos.y) / zoom;
             activeWidth = Math.max(0.5, Math.min(24, resizeStartDims.width + Math.round((deltaX / CELL_WIDTH) * 4) / 4));
             activeHeight = Math.max(0.5, Math.min(24, resizeStartDims.height + Math.round((deltaY / CELL_HEIGHT) * 4) / 4));
          }

          const widthPx = activeWidth * CELL_WIDTH - 20;
          const heightPx = activeHeight * CELL_HEIGHT - 16;
          
          const isSelected = new Set(selectedNodeIds).has(node.id);
          const isOrigin = linkOriginId === node.id;
          const isLinkTarget = linkOriginId !== null && linkOriginId !== node.id;
          const isToggleActive = isIncidentActive && !!activeToggles[node.id];
          
          const timerValue = activeTimers[node.id];
          
          let searchDimmed = false;
          let highlightSearch = false;
          if (searchQuery && searchQuery.trim().length > 0) {
             const lowerQuery = searchQuery.toLowerCase();
             const matches = (node.label && node.label.toLowerCase().includes(lowerQuery)) || (node.notes && node.notes.toLowerCase().includes(lowerQuery));
             if (!matches) {
                searchDimmed = true;
             } else {
                highlightSearch = true;
             }
          }
          const isGrayedOut = trackingDimOverlay || searchDimmed;

          const fontSizeClass = node.fontSize === 'sm' ? 'text-xs' : 
                                node.fontSize === 'lg' ? 'text-lg' : 
                                node.fontSize === 'xl' ? 'text-xl' : 
                                node.fontSize === '2xl' ? 'text-2xl' : 
                                node.fontSize === '3xl' ? 'text-3xl' : 'text-sm';
          const fontWeightClass = node.isBold ? 'font-bold' : 'font-medium';
          
          // Background mapping for panels based on color property
          const panelBgColors: Record<string, string> = {
            emerald: 'bg-emerald-100/40 border-emerald-300',
            amber: 'bg-amber-100/40 border-amber-300',
            rose: 'bg-rose-100/40 border-rose-300',
            sky: 'bg-sky-100/40 border-sky-300',
            indigo: 'bg-indigo-100/40 border-indigo-300',
            slate: 'bg-slate-100/40 border-slate-300',
            violet: 'bg-violet-100/40 border-violet-300',
            red: 'bg-red-500 border-red-600',
            orange: 'bg-orange-500 border-orange-600',
            yellow: 'bg-yellow-100/80 border-yellow-400',
            green: 'bg-green-500 border-green-600',
            blue: 'bg-blue-500 border-blue-600',
            black: 'bg-slate-900 border-slate-950',
            white: 'bg-white border-slate-200'
          };
          
          const panelTextColors: Record<string, string> = {
             red: 'text-white', orange: 'text-white', green: 'text-white', blue: 'text-white', black: 'text-white',
             emerald: 'text-emerald-800', amber: 'text-amber-900', rose: 'text-rose-900', sky: 'text-sky-900', indigo: 'text-indigo-900', slate: 'text-slate-800', violet: 'text-violet-900', yellow: 'text-yellow-900', white: 'text-slate-900'
          };

          const renderLinkButton = () => {
              if (!isEditMode || !isSelected) return null;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartTrackingModeLink(node.id);
                  }}
                  className={`absolute -bottom-3 right-5 p-1.5 rounded-full shadow-md z-40 transition-transform hover:scale-110 pointer-events-auto ${isOrigin ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                  title="Draw connecting line"
                  style={{ touchAction: 'none' }}
                >
                  <Icons.Link2 className="w-3.5 h-3.5" />
                </button>
              );
           };

           const renderResizeHandle = () => {
             if (!isEditMode || !isSelected) return null;
             return (
               <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-slate-300 rounded-tl-sm rounded-br-lg hover:bg-slate-400 z-50 flex items-center justify-center opacity-80"
                  onPointerDown={(e) => handleResizeStart(e, node)}
                  onPointerMove={(e) => handleResizeMove(e, node)}
                  onPointerUp={(e) => handleResizeEnd(e, node)}
               >
                 <svg className="w-2.5 h-2.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21 15-6 6"/><path d="m21 8-13 13"/></svg>
               </div>
             );
          };

          if (node.type === 'panel') {
            const panelColor = node.color || 'emerald';
            return (
              <div
                key={node.id}
                id={`panel_node_${node.id}`}
                className={`absolute z-0 flex flex-col p-4 rounded-xl border-2 overflow-hidden transition-all duration-300 ${panelBgColors[panelColor] || panelBgColors.slate} ${isSelected ? "ring-4 ring-blue-500/50 shadow-md" : (highlightSearch ? "ring-4 ring-yellow-400 shadow-md" : "shadow-sm")}`}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                  cursor: isEditMode ? 'move' : 'default',
                  touchAction: 'none'
                }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    if (isLinkTarget) {
                      onCompleteLink(node.id);
                    } else {
                      onSelectNode(node.id);
                    }
                  }
                }}
              >
                <div className="flex gap-2 items-center w-full min-w-0">
                  <h3 className={`font-display tracking-wide uppercase ${fontSizeClass} ${fontWeightClass} ${panelTextColors[panelColor] || panelTextColors.slate} whitespace-nowrap overflow-hidden text-ellipsis`}>
                    {node.label}
                  </h3>
                </div>
                {node.notes && (
                  <p className={`mt-1 font-medium ${panelTextColors[panelColor] || panelTextColors.slate} opacity-90 text-sm whitespace-pre-wrap`}>
                    {node.notes}
                  </p>
                )}
                {isEditMode && (
                  <div className={`absolute top-2 right-2 text-[10px] font-mono p-1 rounded bg-black/10 ${panelTextColors[panelColor] || panelTextColors.slate}`}>
                    PANEL
                  </div>
                )}
                {renderLinkButton()}
                {renderResizeHandle()}
              </div>
            );
          }
          
          if (node.type === 'input') {
             return (
              <div
                key={node.id}
                id={`input_node_${node.id}`}
                className={`absolute z-20 flex px-3 py-2 items-center gap-3 bg-white rounded-lg border-2 transition-all duration-300 ${isSelected ? "ring-4 ring-blue-500/50 border-blue-400" : (highlightSearch ? "ring-4 ring-yellow-400 border-yellow-400" : "border-slate-300")} ${isGrayedOut && isEditMode ? 'opacity-60' : ''}`}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                  cursor: isEditMode ? 'move' : 'default',
                  touchAction: 'none'
                }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    if (isLinkTarget) {
                      onCompleteLink(node.id);
                    } else {
                      onSelectNode(node.id);
                    }
                  }
                }}
              >
                <label className={`font-bold text-slate-700 whitespace-nowrap ${fontSizeClass} ${fontWeightClass}`}>
                    {node.label}
                </label>
                {node.inputType === 'checkbox' ? (
                   <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-auto cursor-pointer" onClick={(e) => { if (isEditMode) e.preventDefault(); }} onChange={(e) => { if (!isEditMode && onDataLog) onDataLog(node.label, e.target.checked ? 'Checked' : 'Unchecked'); }} />
                ) : (
                   <input type={node.inputType === 'time' ? 'time' : 'text'} placeholder={node.placeholder || ''} className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto" onClick={(e) => { if (isEditMode) e.preventDefault(); e.stopPropagation(); }} onChange={(e) => { if (node.inputType === 'time' && !isEditMode && onDataLog) onDataLog(node.label, e.target.value); }} onBlur={(e) => { if (node.inputType !== 'time' && !isEditMode && e.target.value && onDataLog) onDataLog(node.label, e.target.value); }} />
                )}
                {isEditMode && <div className="absolute -top-2 -right-2 text-[9px] bg-slate-800 text-white px-1 rounded font-mono">INPUT</div>}
                {renderLinkButton()}
                {renderResizeHandle()}
              </div>
             );
          }
          
          if (node.type === 'table') {
             return (
              <div
                key={node.id}
                id={`table_node_${node.id}`}
                className={`absolute z-10 flex flex-col bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500/50 border-blue-400' : 'border-slate-300'}`}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                  cursor: isEditMode ? 'move' : 'default',
                  touchAction: 'none'
                }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    if (isLinkTarget) {
                      onCompleteLink(node.id);
                    } else {
                      onSelectNode(node.id);
                    }
                  }
                }}
              >
                {/* Table Header */}
                <div className={`w-full py-1.5 px-3 flex items-center justify-between border-b ${panelBgColors[node.color || 'slate']} ${panelTextColors[node.color || 'slate']}`}>
                    <h3 className={`font-bold whitespace-nowrap ${fontSizeClass} ${fontWeightClass}`}>{node.label}</h3>
                    {isEditMode && <div className="text-[9px] bg-black/10 px-1 rounded font-mono">TABLE</div>}
                </div>
                {/* Table Grid */}
                <div className="flex-1 overflow-auto pointer-events-auto p-1 relative">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr>
                            {node.tableHeaders?.map((th, i) => (
                               <th key={`th-${i}`} className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-2 border-b border-slate-200 bg-slate-50">{th}</th>
                            ))}
                         </tr>
                      </thead>
                      <tbody>
                         {node.tableRows?.map((tr, rIndex) => (
                            <tr key={`tr-${rIndex}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                               {tr.map((td, cIndex) => (
                                  <td key={`td-${rIndex}-${cIndex}`} className="p-2 align-top">
                                     <input type="text" defaultValue={td} placeholder="..." className="w-full bg-transparent text-sm text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5" onClick={(e) => { if (isEditMode) e.preventDefault(); e.stopPropagation(); }} onBlur={(e) => { if (!isEditMode && e.target.value !== td && onDataLog) onDataLog(`${node.label} - ${node.tableHeaders?.[cIndex] || 'Col '+cIndex}`, e.target.value); }} />
                                  </td>
                               ))}
                            </tr>
                         ))}
                      </tbody>
                   </table>
                   {renderLinkButton()}
                   {renderResizeHandle()}
                </div>
              </div>
             );
          }

          if (node.type === 'checklist') {
             return (
              <div
                key={node.id}
                id={`chk_node_${node.id}`}
                className={`absolute z-10 flex flex-col bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500/50 border-blue-400' : 'border-slate-300'}`}
                style={{ left: `${leftPx}px`, top: `${topPx}px`, width: `${widthPx}px`, height: `${heightPx}px`, cursor: isEditMode ? 'move' : 'default', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => { e.stopPropagation(); if (isEditMode) { if (isLinkTarget) onCompleteLink(node.id); else onSelectNode(node.id); } }}
              >
                <div className={`w-full py-1.5 px-3 flex items-center justify-between border-b ${panelBgColors[node.color || 'slate']} ${panelTextColors[node.color || 'slate']}`}>
                    <h3 className={`font-bold whitespace-nowrap ${fontSizeClass} ${fontWeightClass}`}>{node.label}</h3>
                    {isEditMode && <div className="text-[9px] bg-black/10 px-1 rounded font-mono">CHK</div>}
                </div>
                <div className="flex-1 overflow-auto pointer-events-auto p-2 relative flex flex-col gap-2">
                   {node.checklistItems?.map((item) => (
                     <label key={item.id} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer p-1 hover:bg-slate-50 rounded">
                        <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" onClick={(e) => { if (isEditMode) e.preventDefault(); }} onChange={(e) => { if (!isEditMode && onDataLog) onDataLog(`${node.label} - ${item.text}`, e.target.checked ? 'Checked' : 'Unchecked'); }} />
                        <span className="leading-tight">{item.text}</span>
                     </label>
                   ))}
                   {renderLinkButton()}
                   {renderResizeHandle()}
                </div>
              </div>
             );
          }

          if (node.type === 'vitals') {
             return (
              <div
                key={node.id}
                id={`vitals_node_${node.id}`}
                className={`absolute z-10 flex flex-col bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500/50 border-blue-400' : 'border-slate-300'}`}
                style={{ left: `${leftPx}px`, top: `${topPx}px`, width: `${widthPx}px`, height: `${heightPx}px`, cursor: isEditMode ? 'move' : 'default', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => { e.stopPropagation(); if (isEditMode) { if (isLinkTarget) onCompleteLink(node.id); else onSelectNode(node.id); } }}
              >
                <div className={`w-full py-1.5 px-3 flex items-center justify-between border-b ${panelBgColors[node.color || 'blue']} ${panelTextColors[node.color || 'blue']}`}>
                    <h3 className={`font-bold whitespace-nowrap flex items-center gap-2 ${fontSizeClass} ${fontWeightClass}`}><Icons.HeartPulse className="w-4 h-4" />{node.label}</h3>
                    {isEditMode && <div className="text-[9px] bg-black/10 px-1 rounded font-mono">VITALS</div>}
                </div>
                <div className="flex-1 overflow-auto pointer-events-auto p-3 relative grid grid-cols-2 gap-3 items-start content-start">
                   {node.vitalsFields?.showHR && <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">HR (bpm)</label><input type="number" placeholder="bpm" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onClick={(e) => { if(isEditMode) e.preventDefault(); e.stopPropagation(); }} onBlur={(e) => { if (!isEditMode && e.target.value && onDataLog) onDataLog(`${node.label} - HR`, e.target.value); }} /></div>}
                   {node.vitalsFields?.showBP && <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">BP (SYS/DIA)</label><input type="text" placeholder="SYS/DIA" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onClick={(e) => { if(isEditMode) e.preventDefault(); e.stopPropagation(); }} onBlur={(e) => { if (!isEditMode && e.target.value && onDataLog) onDataLog(`${node.label} - BP`, e.target.value); }} /></div>}
                   {node.vitalsFields?.showSpO2 && <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">SpO2 %</label><input type="number" placeholder="%" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onClick={(e) => { if(isEditMode) e.preventDefault(); e.stopPropagation(); }} onBlur={(e) => { if (!isEditMode && e.target.value && onDataLog) onDataLog(`${node.label} - SpO2`, e.target.value); }} /></div>}
                   {node.vitalsFields?.showRR && <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Resp Rate</label><input type="number" placeholder="resp/m" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onClick={(e) => { if(isEditMode) e.preventDefault(); e.stopPropagation(); }} onBlur={(e) => { if (!isEditMode && e.target.value && onDataLog) onDataLog(`${node.label} - RR`, e.target.value); }} /></div>}
                   {node.vitalsFields?.showTemp && <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Temp °C</label><input type="number" placeholder="°C" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" onClick={(e) => { if(isEditMode) e.preventDefault(); e.stopPropagation(); }} onBlur={(e) => { if (!isEditMode && e.target.value && onDataLog) onDataLog(`${node.label} - Temp`, e.target.value); }} /></div>}
                   {renderLinkButton()}
                   {renderResizeHandle()}
                </div>
              </div>
             );
          }

          if (node.type === 'medication') {
             return (
              <div
                key={node.id}
                id={`med_node_${node.id}`}
                className={`absolute z-10 flex flex-col bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500/50 border-blue-400' : 'border-slate-300'}`}
                style={{ left: `${leftPx}px`, top: `${topPx}px`, width: `${widthPx}px`, height: `${heightPx}px`, cursor: isEditMode ? 'move' : 'default', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => { e.stopPropagation(); if (isEditMode) { if (isLinkTarget) onCompleteLink(node.id); else onSelectNode(node.id); } }}
              >
                <div className={`w-full py-1.5 px-3 flex items-center justify-between border-b ${panelBgColors[node.color || 'rose']} ${panelTextColors[node.color || 'rose']}`}>
                    <h3 className={`font-bold whitespace-nowrap flex items-center gap-2 ${fontSizeClass} ${fontWeightClass}`}><Icons.Syringe className="w-4 h-4" />{node.label}</h3>
                    {isEditMode && <div className="text-[9px] bg-black/10 px-1 rounded font-mono">MED</div>}
                </div>
                <div className="flex-1 overflow-auto pointer-events-auto p-2 relative flex flex-col gap-2">
                   {node.medicationOptions?.map((med, idx) => (
                     <button key={idx} onClick={(e) => { if (isEditMode) e.preventDefault(); e.stopPropagation(); if (!isEditMode && onDataLog) onDataLog(`${node.label} given`, med); }} className="px-3 py-2 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg hover:bg-rose-100 border border-rose-200 shadow-sm active:scale-95 transition-all w-full text-left flex items-center justify-between cursor-pointer">
                        <span>{med}</span>
                        <div className="bg-white rounded-md p-1 shadow-sm border border-rose-100">
                          <Icons.Plus className="w-3 h-3 text-rose-600" />
                        </div>
                     </button>
                   ))}
                   {renderLinkButton()}
                   {renderResizeHandle()}
                </div>
              </div>
             );
          }

          if (node.type === 'timer') {
             const isExpired = timerValue?.isExpired;
             return (
              <div
                key={node.id}
                id={`timer_node_${node.id}`}
                className={`absolute z-10 flex flex-col bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500/50 border-blue-400' : isExpired ? 'border-red-500 ring-4 ring-red-500/30' : 'border-slate-300'}`}
                style={{ left: `${leftPx}px`, top: `${topPx}px`, width: `${widthPx}px`, height: `${heightPx}px`, cursor: isEditMode ? 'move' : 'pointer', touchAction: 'none' }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => { 
                   e.stopPropagation(); 
                   if (isEditMode) { 
                      if (isLinkTarget) onCompleteLink(node.id); 
                      else onSelectNode(node.id); 
                   } else if (isIncidentActive) {
                      onNodeClickInTracking(node);
                   }
                }}
              >
                <div className={`w-full py-1.5 px-3 flex items-center justify-between border-b ${panelBgColors[node.color || 'amber']} ${panelTextColors[node.color || 'amber']}`}>
                    <h3 className={`font-bold whitespace-nowrap flex items-center gap-2 ${fontSizeClass} ${fontWeightClass}`}><Icons.Timer className="w-4 h-4" />{node.label}</h3>
                    {isEditMode && <div className="text-[9px] bg-black/10 px-1 rounded font-mono">TIMER</div>}
                </div>
                <div className="flex-1 pointer-events-auto relative flex flex-col items-center justify-center p-2">
                   <div className={`font-mono text-4xl font-bold tracking-tight ${timerValue ? (isExpired ? 'text-red-600 animate-pulse' : 'text-slate-800') : 'text-slate-300'}`}>
                      {timerValue ? timerValue.counter : (node.timerDurationSec ? `${Math.floor(node.timerDurationSec/60)}:${(node.timerDurationSec%60).toString().padStart(2, '0')}` : '0:00')}
                   </div>
                   {!isEditMode && isIncidentActive && (
                      <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                         {timerValue ? (isExpired ? 'EXPIRED' : 'RUNNING (TAP TO RESET)') : 'TAP TO START'}
                      </div>
                   )}
                   {renderLinkButton()}
                   {renderResizeHandle()}
                </div>
              </div>
             );
          }

          // Text Annotation Layout (Differs completely from button actions)
          if (node.type === 'annotation') {

            return (
              <div
                key={node.id}
                id={`ann_node_${node.id}`}
                className={`absolute z-20 overflow-visible transition-all duration-300 rounded-xl p-3 flex flex-row items-start gap-2.5 bg-slate-50/90 border border-dashed text-slate-600 font-sans ${
                  isSelected ? "ring-2 ring-blue-500 border-blue-400 shadow-sm" : (highlightSearch ? "ring-2 ring-yellow-400 border-yellow-400 shadow-sm" : "border-slate-300 hover:border-slate-400")
                } ${isGrayedOut ? 'opacity-60 grayscale-[0.8] pointer-events-none' : ''}`}
                style={{
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                  cursor: isEditMode ? 'move' : 'default',
                  touchAction: 'none'
                }}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={(e) => handlePointerMove(e, node)}
                onPointerUp={(e) => handlePointerUp(e, node)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    if (isLinkTarget) {
                      onCompleteLink(node.id);
                    } else {
                      onSelectNode(node.id);
                    }
                  }
                }}
              >
                <Icons.AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 pr-4 flex flex-col gap-1 overflow-y-auto max-h-full">
                  <p className={`font-display whitespace-pre-wrap leading-relaxed text-slate-800 ${fontSizeClass} ${fontWeightClass}`}>
                    {node.label || "Custom annotation text goes here..."}
                  </p>
                  {node.notes && (
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-500 text-xs italic">
                      {node.notes}
                    </p>
                  )}
                </div>

                {isEditMode && (
                  <div className="absolute right-1 top-1 text-[10px] text-slate-400 font-mono no-print">
                    TXT
                  </div>
                )}
                {renderLinkButton()}
                {renderResizeHandle()}
              </div>
            );
          }

          // Clinical Interactive Actions Button Node
          
          const buttonFontSizeClass = node.fontSize === 'sm' ? 'text-xs' :
                                      node.fontSize === 'lg' ? 'text-lg' :
                                      node.fontSize === 'xl' ? 'text-xl' : 'text-[15px]';
          const buttonFontWeightClass = node.isBold ? 'font-black' : 'font-bold';

          return (
            <div
              key={node.id}
              id={`action_node_${node.id}`}
              className={`absolute z-20 flex flex-col p-2 border-[3px] justify-center items-center rounded-xl transition-all duration-300 ${
                isOrigin 
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500' 
                  : isLinkTarget 
                  ? 'bg-amber-50 border-amber-500 opacity-90 animate-pulse hover:scale-105'
                  : isToggleActive
                  ? 'bg-emerald-100 border-emerald-600 ring-4 ring-emerald-400/50 animate-pulse scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : colorMap[node.color || 'slate']
              } ${
                isSelected ? 'ring-4 ring-blue-600/50 border-blue-500 scale-[1.02] shadow-lg z-30' : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'
              } ${isGrayedOut ? 'opacity-60 grayscale-[0.5] select-none pointer-events-none' : 'cursor-pointer'}`}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${widthPx}px`,
                height: `${heightPx}px`,
                touchAction: 'none',
              }}
              onPointerDown={(e) => handlePointerDown(e, node)}
              onPointerMove={(e) => handlePointerMove(e, node)}
              onPointerUp={(e) => handlePointerUp(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                if (isEditMode) {
                  if (isLinkTarget) {
                    onCompleteLink(node.id);
                  } else {
                    onSelectNode(node.id);
                  }
                } else if (isIncidentActive) {
                  onNodeClickInTracking(node);
                }
              }}
            >
              {/* Top Right Floating indicators */}
              <div className="absolute top-1 right-1 flex gap-1 z-30 items-center">
                {node.notes && isIncidentActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode(node.id);
                    }}
                    className="bg-amber-100/90 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm border border-amber-200 hover:bg-amber-200 hover:border-amber-300 outline-none text-amber-700 transition-colors pointer-events-auto flex items-center gap-0.5"
                    title="View Information / Memory Jogger"
                  >
                    <Icons.Info className="w-3.5 h-3.5" />
                    {node.width >= 3 && <span className="text-[9px] font-bold uppercase tracking-wider font-display hidden pt-0.5 xl:block">Info</span>}
                  </button>
                )}
                {node.vocalConfirmation && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-full p-0.5 shadow-sm pointer-events-none">
                    <Icons.Volume2 className="w-3 h-3 text-slate-500" />
                  </div>
                )}
                {node.hasPrompt && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-full p-0.5 shadow-sm pointer-events-none">
                    <Icons.HelpCircle className="w-3 h-3 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Edit indicators Floating Bottom Right */}
              {renderLinkButton()}

              {/* Tracking session local timers (Floating Top Left) */}
              {isIncidentActive && timerValue && (
                <div className="absolute -top-3 -left-3 bg-red-600 text-white font-mono text-xs font-bold px-2 py-1 rounded-full shadow-md animate-pulse z-40">
                  🕛 {timerValue.counter}
                </div>
              )}

              {/* Main Centered Content */}
              <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none p-1">
                <DynamicIcon name={node.icon} className={`${activeHeight <= 0.75 ? 'hidden' : 'w-4 h-4'} mb-0.5 opacity-90 shrink-0`} />
                <h4 className={`font-display leading-tight text-center text-ellipsis overflow-hidden w-full text-balance ${buttonFontSizeClass} ${buttonFontWeightClass}`}>
                  {node.label || "Action Button"}
                </h4>
                {node.notes && activeHeight > 1 && (
                  <span className="text-[10px] sm:text-[9px] mt-0.5 font-medium opacity-80 italic text-center w-full line-clamp-2 leading-snug">
                    {node.notes}
                  </span>
                )}
              </div>
              {renderResizeHandle()}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
