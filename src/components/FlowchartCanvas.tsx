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
  selectedNodeId: string | null;
  linkOriginId: string | null; // For connecting nodes together
  onSelectNode: (id: string | null) => void;
  onUpdateNodeCoordinates: (id: string, x: number, y: number) => void;
  onUpdateNodeDimensions?: (id: string, width: number, height: number) => void;
  onNodeClickInTracking: (node: FlowNode) => void;
  onDataLog?: (labelPrefix: string, value: string) => void;
  onStartTrackingModeLink: (id: string) => void;
  onCompleteLink: (targetId: string) => void;
  onDeleteConnection: (connId: string) => void;
  activeTimers: { [nodeId: string]: { lastPressedAt: number; counter: string } };
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
  selectedNodeId,
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
  
  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 }); // Current mouse/pointer position relative to canvas

  // Resizing state
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartDims, setResizeStartDims] = useState({ width: 0, height: 0 });
  const [resizeCurrentPos, setResizeCurrentPos] = useState({ x: 0, y: 0 });

  // Handle snapping calculation
  const getSnapCoords = (pixelsX: number, pixelsY: number, sizeC: number, sizeR: number) => {
    let x = Math.round(pixelsX / CELL_WIDTH);
    let y = Math.round(pixelsY / CELL_HEIGHT);
    // Boundary check
    x = Math.max(0, Math.min(GRID_COLS - sizeC, x));
    y = Math.max(0, Math.min(GRID_ROWS - sizeR, y));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (!isEditMode) return;
    if (linkOriginId) return; // Linking tool takes precedence

    e.stopPropagation();
    // Record selection
    onSelectNode(node.id);

    // Save offset
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = containerRef.current?.getBoundingClientRect();
    if (!parentRect) return;

    setDraggingId(node.id);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragPos({
      x: rect.left - parentRect.left,
      y: rect.top - parentRect.top,
    });
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (draggingId !== node.id || !containerRef.current) return;
    e.stopPropagation();

    const parentRect = containerRef.current.getBoundingClientRect();
    const candidateX = e.clientX - parentRect.left - dragOffset.x;
    const candidateY = e.clientY - parentRect.top - dragOffset.y;

    setDragPos({ x: candidateX, y: candidateY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, node: FlowNode) => {
    if (resizingId === node.id) {
       // Cannot release capture on different element normally? But we bound it to the resize handle
       // Actually handled in handleResizeEnd. We'll ignore here if dragging.
    }
    
    if (draggingId !== node.id) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);

    // Calculate final snapped block coordinate
    const snapped = getSnapCoords(dragPos.x, dragPos.y, node.width, node.height);
    onUpdateNodeCoordinates(node.id, snapped.x, snapped.y);
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
    
    const deltaX = resizeCurrentPos.x - resizeStartPos.x;
    const deltaY = resizeCurrentPos.y - resizeStartPos.y;
    const deltaW = Math.round(deltaX / CELL_WIDTH);
    const deltaH = Math.round(deltaY / CELL_HEIGHT);
    const newW = Math.max(1, Math.min(24, resizeStartDims.width + deltaW));
    const newH = Math.max(1, Math.min(24, resizeStartDims.height + deltaH));
    
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
  const calculateConnectionLine = (fromNode: FlowNode, toNode: FlowNode) => {
    const fromPorts = getNodePorts(fromNode);
    const toPorts = getNodePorts(toNode);

    // Direct center-to-center vector to see which sides face each other
    const dx = toPorts.center.x - fromPorts.center.x;
    const dy = toPorts.center.y - fromPorts.center.y;

    let start = fromPorts.bottom;
    let end = toPorts.top;

    if (Math.abs(dx) > Math.abs(dy)) {
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

    return { start, end };
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
    <div id="canvas-scroll-container" className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm relative min-h-[500px]">
      
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
          height: `${GRID_ROWS * CELL_HEIGHT}px`,
        }}
        onClick={() => onSelectNode(null)}
      >
        {/* Dynamic connection paths lines layer */}
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

            const { start, end } = calculateConnectionLine(fromNode, toNode);
            const isSelected = selectedNodeId === fromNode.id || selectedNodeId === toNode.id;

            return (
              <React.Fragment key={conn.id}>
                {/* Visual Connection line */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isSelected ? '#10b981' : '#64748b'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
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
          const leftPx = isDragging ? dragPos.x : node.x * CELL_WIDTH + 10;
          const topPx = isDragging ? dragPos.y : node.y * CELL_HEIGHT + 8;
          const isResizing = resizingId === node.id;
          let activeWidth = node.width;
          let activeHeight = node.height;
          if (isResizing) {
             const deltaX = resizeCurrentPos.x - resizeStartPos.x;
             const deltaY = resizeCurrentPos.y - resizeStartPos.y;
             activeWidth = Math.max(1, Math.min(24, resizeStartDims.width + Math.round(deltaX / CELL_WIDTH)));
             activeHeight = Math.max(1, Math.min(24, resizeStartDims.height + Math.round(deltaY / CELL_HEIGHT)));
          }

          const widthPx = activeWidth * CELL_WIDTH - 20;
          const heightPx = activeHeight * CELL_HEIGHT - 16;
          
          const isSelected = selectedNodeId === node.id;
          const isOrigin = linkOriginId === node.id;
          const isLinkTarget = linkOriginId !== null && linkOriginId !== node.id;
          const isToggleActive = !!activeToggles[node.id];
          
          const timerValue = activeTimers[node.id];
          const isGrayedOut = trackingDimOverlay;

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
                className={`absolute z-0 flex flex-col p-4 rounded-xl border-2 overflow-hidden transition-all duration-300 ${panelBgColors[panelColor] || panelBgColors.slate} ${isSelected ? 'ring-4 ring-blue-500/50 shadow-md' : 'shadow-sm'}`}
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
                className={`absolute z-20 flex px-3 py-2 items-center gap-3 bg-white rounded-lg border-2 transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500/50 border-blue-400' : 'border-slate-300'} ${isGrayedOut && isEditMode ? 'opacity-60' : ''}`}
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

          // Text Annotation Layout (Differs completely from button actions)
          if (node.type === 'annotation') {

            return (
              <div
                key={node.id}
                id={`ann_node_${node.id}`}
                className={`absolute z-20 overflow-visible transition-all duration-300 rounded-xl p-3 flex flex-row items-start gap-2.5 bg-slate-50/90 border border-dashed text-slate-600 font-sans ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-400 shadow-sm' : 'border-slate-300 hover:border-slate-400'
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
              {timerValue && (
                <div className="absolute -top-3 -left-3 bg-red-600 text-white font-mono text-xs font-bold px-2 py-1 rounded-full shadow-md animate-pulse z-40">
                  🕛 {timerValue.counter}
                </div>
              )}

              {/* Main Centered Content */}
              <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none">
                <DynamicIcon name={node.icon} className="w-6 h-6 mb-1.5 opacity-90" />
                <h4 className={`font-display leading-tight text-center text-ellipsis overflow-hidden w-full px-1 text-balance ${buttonFontSizeClass} ${buttonFontWeightClass}`}>
                  {node.label || "Action Button"}
                </h4>
                {node.notes && (
                  <span className="text-[10px] mt-1.5 font-medium opacity-80 italic text-center w-full px-2 line-clamp-2 leading-snug">
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
  );
}
