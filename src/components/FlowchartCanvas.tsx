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
  onNodeClickInTracking: (node: FlowNode) => void;
  onStartTrackingModeLink: (id: string) => void;
  onCompleteLink: (targetId: string) => void;
  onDeleteConnection: (connId: string) => void;
  activeTimers: { [nodeId: string]: { lastPressedAt: number; counter: string } };
  activeToggles: Record<string, boolean>;
}

// Fixed dimensions for grid cells in pixels
const CELL_WIDTH = 100;
const CELL_HEIGHT = 60;
const GRID_COLS = 12;
const GRID_ROWS = 14;

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
  onNodeClickInTracking,
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
    if (draggingId !== node.id) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);

    // Calculate final snapped block coordinate
    const snapped = getSnapCoords(dragPos.x, dragPos.y, node.width, node.height);
    onUpdateNodeCoordinates(node.id, snapped.x, snapped.y);
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
                  strokeDasharray={fromNode.type === 'annotation' ? '4,4' : undefined}
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
        {nodes.map((node) => {
          const isDragging = draggingId === node.id;
          const leftPx = isDragging ? dragPos.x : node.x * CELL_WIDTH + 10;
          const topPx = isDragging ? dragPos.y : node.y * CELL_HEIGHT + 8;
          const widthPx = node.width * CELL_WIDTH - 20;
          const heightPx = node.height * CELL_HEIGHT - 16;
          
          const isSelected = selectedNodeId === node.id;
          const isOrigin = linkOriginId === node.id;
          
          const timerValue = activeTimers[node.id];

          // Text Annotation Layout (Differs completely from button actions)
          if (node.type === 'annotation') {
            const isGrayedOut = trackingDimOverlay;
            return (
              <div
                key={node.id}
                id={`ann_node_${node.id}`}
                className={`absolute z-20 overflow-visible transition-all duration-300 rounded-xl p-3 flex flex-row items-start gap-2.5 bg-slate-50/90 border border-dashed text-slate-600 font-sans text-xs ${
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
                  onSelectNode(node.id);
                }}
              >
                <Icons.AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-display whitespace-pre-wrap leading-relaxed text-slate-600 font-medium">
                    {node.label || "Custom annotation text goes here..."}
                  </p>
                </div>

                {isEditMode && (
                  <div className="absolute right-1 top-1 text-[10px] text-slate-400 font-mono no-print">
                    TXT
                  </div>
                )}
              </div>
            );
          }

          // Clinical Interactive Actions Button Node
          const isLinkTarget = linkOriginId !== null && linkOriginId !== node.id;
          const isGrayedOut = trackingDimOverlay;
          const isToggleActive = !!activeToggles[node.id];

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
              <div className="absolute top-1 right-1 flex gap-1 z-30 pointer-events-none">
                {node.vocalConfirmation && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-full p-0.5 shadow-sm">
                    <Icons.Volume2 className="w-3 h-3 text-slate-500" />
                  </div>
                )}
                {node.hasPrompt && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-full p-0.5 shadow-sm">
                    <Icons.HelpCircle className="w-3 h-3 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Edit indicators Floating Bottom Right */}
              {isEditMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartTrackingModeLink(node.id);
                  }}
                  className={`absolute -bottom-3 right-2 p-1.5 rounded-full shadow-md z-40 transition-transform hover:scale-110 pointer-events-auto ${isOrigin ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                  title="Draw connecting line"
                >
                  <Icons.Link2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Tracking session local timers (Floating Top Left) */}
              {timerValue && (
                <div className="absolute -top-3 -left-3 bg-red-600 text-white font-mono text-xs font-bold px-2 py-1 rounded-full shadow-md animate-pulse z-40">
                  🕛 {timerValue.counter}
                </div>
              )}

              {/* Main Centered Content */}
              <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none">
                <DynamicIcon name={node.icon} className="w-6 h-6 mb-1.5 opacity-90" />
                <h4 className="font-display font-bold text-[15px] leading-tight text-center text-ellipsis overflow-hidden w-full px-1 text-balance">
                  {node.label || "Action Button"}
                </h4>
                {node.notes && (
                  <span className="text-[10px] mt-1.5 font-medium opacity-80 italic text-center w-full px-2 line-clamp-2 leading-snug">
                    {node.notes}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
