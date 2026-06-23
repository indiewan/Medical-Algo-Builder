/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { FlowNode, MedicalAlgorithm, FlowConnection } from '../types.ts';

// Dynamic Lucide icon helper
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  if (!name || name === 'None') return <span className="w-4 h-4 text-xs flex items-center justify-center font-bold">--</span>;
  if (name === 'LetterA') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 20 7-16 7 16"/><path d="m8 14 h8"/></svg>;
  if (name === 'LetterB') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>;
  if (name === 'LetterC') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 1 0 0 6"/></svg>;
  if (name === 'LetterD') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a8 8 0 0 1 8 8 8 8 0 0 1-8 8H6z"/></svg>;
  if (name === 'LetterE') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 4H6v16h12"/><path d="M6 12h10"/></svg>;
  if (name === 'O2Mask') return <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8v3c0 1.5 2 3 6 3s6-1.5 6-3V8"/><path d="M12 14v7"/><path d="M8 21h8"/><path d="M4 10l-1.5-1.5"/><path d="M20 10l1.5-1.5"/></svg>;
  
  const LucideIcon = (Icons as any)[name] || Icons.HelpCircle;
  return <LucideIcon className={className || "w-4 h-4"} />;
};

interface SidebarProps {
  isEditMode: boolean;
  isSharedResource: boolean;
  selectedNode: FlowNode | null;
  selectedAlgo: MedicalAlgorithm;
  isIncidentActive: boolean;
  activeLogs: any[];
  isMuted: boolean;
  onSetMuted: (muted: boolean) => void;
  onAdHocNoteSubmit: (note: string) => void;
  onUpdateSelectedNode: (updated: Partial<FlowNode>) => void;
  onDeleteSelectedNode: () => void;
  onDuplicateSelectedNode: () => void;
  onAddNode: (type: 'button' | 'annotation' | 'panel' | 'input' | 'table') => void;
  onStartTrackingModeLink: (id: string) => void;
  onDeleteConnection: (connId: string) => void;
  onUpdateConnection: (connId: string, updates: Partial<FlowConnection>) => void;
  // Templates & User Library Operations
  templates: MedicalAlgorithm[];
  userSavedAlgos: MedicalAlgorithm[];
  onLoadTemplate: (algo: MedicalAlgorithm) => void;
  onSaveToLibrary: (name: string) => void;
  onDeleteFromLibrary: (id: string) => void;
  onPublishShare: () => string;
  onCancelLog?: (id: string) => void;
}

// Medical/Emergency themed icons list
const CURATED_MEDICAL_ICONS = [
  'None', 'Activity', 'HeartPulse', 'Heart', 'Syringe', 'Pill', 'Flame', 'Clock', 
  'Stethoscope', 'ClipboardCheck', 'Droplet', 'UserCheck', 'ShieldAlert', 
  'Layers', 'BadgeAlert', 'AlertCircle', 'PlusSquare', 'Skull', 'Wind',
  'Thermometer', 'Brain', 'Eye', 'Type', 'BookA', 'LetterA', 'LetterB', 'LetterC', 'LetterD', 'LetterE', 'O2Mask',
  'Bell', 'ArrowRightCircle', 'Copy', 'AlertTriangle', 'Users', 'Search'
];

export default function Sidebar({
  isEditMode,
  isSharedResource,
  selectedNode,
  selectedAlgo,
  isIncidentActive,
  activeLogs,
  isMuted,
  onSetMuted,
  onAdHocNoteSubmit,
  onUpdateSelectedNode,
  onDeleteSelectedNode,
  onDuplicateSelectedNode,
  onAddNode,
  onStartTrackingModeLink,
  onDeleteConnection,
  onUpdateConnection,
  templates,
  userSavedAlgos,
  onLoadTemplate,
  onSaveToLibrary,
  onDeleteFromLibrary,
  onPublishShare,
  onCancelLog,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'library'>('edit');
  const [customAlgoName, setCustomAlgoName] = useState('');
  const [isShareSuccess, setIsShareSuccess] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleShareClick = () => {
    const link = onPublishShare();
    setShareLink(link);
    navigator.clipboard.writeText(link);
    setIsShareSuccess(true);
    setTimeout(() => {
      setIsShareSuccess(false);
    }, 2500);
  };

  const handleSaveLibraryClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAlgoName.trim()) return;
    onSaveToLibrary(customAlgoName.trim());
    setCustomAlgoName('');
  };

  const [isOpen, setIsOpen] = useState(false); // Default to start collapsed on mobile/tablets if possible, but let's default to false except on very large screens? Or true

  useEffect(() => {
     // Auto close on small screens on initial load
     if (window.innerWidth < 1024) {
       setIsOpen(false);
     } else {
       setIsOpen(true);
     }
  }, []);

  if (!isOpen) {
    return (
      <aside className="absolute right-4 bottom-4 lg:relative lg:bottom-auto lg:right-auto z-50 shrink-0">
        <button 
          onClick={() => setIsOpen(true)} 
          className="bg-white p-3 rounded-full lg:rounded-xl border border-slate-200 shadow-md hover:bg-slate-50 text-slate-700 transition"
          title="Open settings sidebar"
        >
          <Icons.Settings className="w-6 h-6 lg:w-5 lg:h-5 text-blue-600 lg:text-slate-700" />
        </button>
      </aside>
    );
  }

  return (
    <aside id="app_sidebar" className="absolute bottom-0 left-0 right-0 h-[60vh] lg:relative lg:h-full w-full lg:w-[380px] bg-white lg:rounded-2xl border-t lg:border border-slate-200 shadow-2xl lg:shadow-sm flex flex-col overflow-hidden no-print z-50 shrink-0">
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-2 right-2 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg z-50 transition-colors"
        title="Hide Sidebar"
      >
        <Icons.X className="w-4 h-4" />
      </button>
      
      {/* Tab Navigation header */}
      {!isSharedResource && (
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider font-display border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'edit'
                ? 'border-blue-600 bg-white text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            id="tab_blueprint_edit"
          >
            <Icons.Wrench className="w-3.5 h-3.5" />
            {isIncidentActive ? "Active Log Control" : "Draft Editor"}
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider font-display border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'library'
                ? 'border-blue-600 bg-white text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            id="tab_library_load"
          >
            <Icons.FolderTree className="w-3.5 h-3.5" />
            Protocols Library
          </button>
        </div>
      )}

      {/* Main Sidebar Contents scrollable container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* --- INCIDENT ACTIVE RUNTIME LOG TAB --- */}
        {isIncidentActive && activeTab === 'edit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-slate-900 uppercase tracking-wide">Live Code Log Feed</h3>
              <button
                onClick={() => onSetMuted(!isMuted)}
                className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
                  isMuted 
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
                title={isMuted ? 'Unmute Speech confirming voice' : 'Mute Speech confirming voice'}
              >
                {isMuted ? (
                  <>
                    <Icons.VolumeX className="w-3.5 h-3.5 text-red-500" />
                    Muted
                  </>
                ) : (
                  <>
                    <Icons.Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    Voice On
                  </>
                )}
              </button>
            </div>

            {/* Current Step active indicator box matching Bento Grid aesthetics */}
            {activeLogs && activeLogs.length > 0 && (
              <div className="bg-blue-900 rounded-2xl p-4 text-white shadow-md animate-bounce-subtle">
                <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-1">Current Step</h4>
                <p className="text-base font-bold leading-tight font-display text-white">
                  {activeLogs[activeLogs.length - 1].nodeLabel}
                </p>
                <p className="text-[10px] mt-2 opacity-80 italic font-mono">
                  Voice recorded at +{activeLogs[activeLogs.length - 1].elapsedFormatted}
                </p>
              </div>
            )}

            {/* Guidance / Memory Jogger Box for Selected Node */}
            {selectedNode && selectedNode.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Info className="w-4 h-4 text-amber-600" />
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-amber-800">Available Information</h4>
                </div>
                <h5 className="text-sm font-bold text-amber-900 mb-1">{selectedNode.label}</h5>
                <p className="text-xs text-amber-900/80 whitespace-pre-wrap font-medium">
                  {selectedNode.notes}
                </p>
              </div>
            )}

            {/* List log items inside current run session */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/55 max-h-[300px] overflow-y-auto">
              {activeLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 space-y-2">
                  <Icons.FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                  <p>Incident Live Log started. Click active buttons on the flowchart to record timestamps.</p>
                </div>
              ) : (
                [...activeLogs].reverse().map((log) => (
                  <div key={log.id} className={`p-3 transition-colors ${log.isAccidental ? 'bg-red-50/50 opacity-75' : 'bg-white hover:bg-slate-50/80'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-xs font-bold leading-tight font-display ${log.isAccidental ? 'text-red-700 line-through' : 'text-slate-800'}`}>
                        {log.nodeLabel}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                        {log.timestamp}
                      </span>
                    </div>
                    {log.notes && (
                      <p className={`mt-1.5 text-xs px-2 py-1.5 rounded font-mono border ${log.isAccidental ? 'text-red-600 bg-red-100/50 border-red-200' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                        {log.notes}
                      </p>
                    )}
                    <div className="mt-1 flex justify-between items-center">
                      {!log.isAccidental ? (
                        <button 
                          onClick={() => onCancelLog && onCancelLog(log.id)}
                          className="text-[9px] uppercase font-bold text-slate-400 hover:text-red-600 tracking-wider flex items-center gap-1 transition-colors"
                        >
                          <Icons.XCircle className="w-3 h-3" />
                          Mark Accidental
                        </button>
                      ) : (
                        <span className="text-[9px] uppercase font-bold text-red-500 tracking-wider">
                          Cancelled Action
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold font-mono ${log.isAccidental ? 'text-red-500' : 'text-emerald-600'}`}>
                        +{log.elapsedFormatted}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* AD-HOC TEXT MANUAL OVERRIDE ENTRY */}
            <form 
              className="bg-white border border-slate-200 rounded-xl p-3 flex gap-2 relative shadow-sm hover:border-slate-300 transition-colors"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('adhoc-note') as HTMLInputElement;
                if (input.value.trim()) {
                  onAdHocNoteSubmit(input.value);
                  input.value = '';
                }
              }}
            >
              <input
                name="adhoc-note"
                type="text"
                placeholder="Log manual extra note..."
                className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none px-1 h-8"
                autoComplete="off"
              />
              <button 
                type="submit"
                className="shrink-0 h-8 w-8 hover:bg-emerald-50 text-emerald-600 rounded-md border border-slate-200 hover:border-emerald-200 flex items-center justify-center transition-colors"
              >
                <Icons.CornerDownLeft className="w-4 h-4" />
              </button>
            </form>
            
            {/* Quick instructions indicator during live session */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-slate-700 font-display flex items-center gap-1.5">
                <Icons.Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                iPad/Phone Field Guideline
              </span>
              <p className="text-xs leading-relaxed text-slate-500">
                Tap on any button in the central flowchart. Spoken audio response will outline the directive and synchronize the audit time log.
              </p>
            </div>

          </div>
        )}

        {/* --- DESIGNER BLUEPRINT EDIT TAB (Only when NOT tracking) --- */}
        {!isIncidentActive && activeTab === 'edit' && !isSharedResource && (
          <div className="space-y-6">
            
            {/* Options to quick place items on the grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display mb-3">Add Elements to Canvas</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAddNode('button')}
                  className="flex items-center gap-2 justify-center py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition active:scale-95 cursor-pointer shadow-sm"
                  id="add_node_btn"
                >
                  <Icons.SquareTerminal className="w-3.5 h-3.5" />
                  + Button
                </button>
                <button
                  onClick={() => onAddNode('annotation')}
                  className="flex items-center gap-2 justify-center py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition active:scale-95 cursor-pointer shadow-sm"
                  id="add_node_anno"
                >
                  <Icons.Type className="w-3.5 h-3.5" />
                  + Text
                </button>
                <button
                  onClick={() => onAddNode('panel')}
                  className="flex items-center gap-2 justify-center py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Icons.Square className="w-3.5 h-3.5" />
                  + Panel Area
                </button>
                <button
                  onClick={() => onAddNode('input')}
                  className="flex items-center gap-2 justify-center py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Icons.Keyboard className="w-3.5 h-3.5" />
                  + Input Field
                </button>
                <button
                  onClick={() => onAddNode('table')}
                  className="col-span-2 flex items-center gap-2 justify-center py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold hover:bg-purple-100 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Icons.Table className="w-3.5 h-3.5" />
                  + Data Table Grid
                </button>
              </div>
            </div>

            {/* Properties pane for selected node */}
            {selectedNode ? (
              <div className="space-y-4 p-4 border border-slate-200 bg-slate-50/55 rounded-2xl animate-fade-in">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 uppercase font-display tracking-wider">
                    {selectedNode.type === 'annotation' ? 'Edit Annotation Label' : 'Configure Action Button'}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={onDuplicateSelectedNode}
                      className="p-1 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded transition"
                      id="property_duplicate_node"
                      title="Duplicate node with current settings"
                    >
                      <Icons.Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onDeleteSelectedNode}
                      className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition"
                      id="property_delete_node"
                      title="Delete node from grid"
                    >
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Edit node title */}
                <div className="space-y-1">
                  <label htmlFor="node_label_edit" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                    {selectedNode.type === 'annotation' ? 'Label Text' : 'Button Name / Title'}
                  </label>
                  <input
                    id="node_label_edit"
                    type="text"
                    value={selectedNode.label}
                    placeholder={selectedNode.type === 'annotation' ? "Type text annotator..." : "e.g. Epinephrine 1mg"}
                    onChange={(e) => onUpdateSelectedNode({ label: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                
                {/* Font Styling Options */}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label htmlFor="node_font_size" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                      Text Size
                    </label>
                    <select
                      id="node_font_size"
                      value={selectedNode.fontSize || 'base'}
                      onChange={(e) => onUpdateSelectedNode({ fontSize: e.target.value as any })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="sm">Small</option>
                      <option value="base">Standard</option>
                      <option value="lg">Large</option>
                      <option value="xl">Extra Large</option>
                    </select>
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <label htmlFor="node_font_bold" className="flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors h-[30px]">
                      <input
                        id="node_font_bold"
                        type="checkbox"
                        checked={selectedNode.isBold || false}
                        onChange={(e) => onUpdateSelectedNode({ isBold: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-700 select-none">Bold</span>
                    </label>
                  </div>
                </div>

                {/* Description / Memory Jogger Notes */}
                <div className="space-y-1">
                  <label htmlFor="node_notes_edit" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                    {selectedNode.type === 'annotation' ? 'Extra Notes / Content' : 'Memory Jogger Info (Notes)'}
                  </label>
                  <textarea
                    id="node_notes_edit"
                    rows={3}
                    value={selectedNode.notes || ''}
                    placeholder={selectedNode.type === 'annotation' ? "Add detailed markdown or text notes..." : "e.g. 1mg IV Push every 3-5 mins, flush line afterwards."}
                    onChange={(e) => onUpdateSelectedNode({ notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-y"
                  />
                  {selectedNode.type === 'button' && (
                    <p className="text-[10px] text-slate-400">Can be viewed rapidly during incident logging.</p>
                  )}
                </div>

                {/* Pre-set CSS High Contrast Thème Colors options */}
                {selectedNode.type !== 'annotation' && selectedNode.type !== 'input' && (
                  <div className="space-y-1">
                    <label htmlFor="node_theme_color" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                      Color Theme
                    </label>
                    <select
                      id="node_theme_color"
                      value={selectedNode.color}
                      onChange={(e) => onUpdateSelectedNode({ color: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="rose">🔴 Critical / Warning (Rose)</option>
                      <option value="amber">🟡 Assess (Amber)</option>
                      <option value="emerald">🟢 Drug / Treatment (Emerald)</option>
                      <option value="sky">🔵 Fluids (Sky)</option>
                      <option value="indigo">🟣 Diagnostic (Indigo)</option>
                      <option value="violet">🧬 Protocol (Violet)</option>
                      <option value="slate">⚪ Default (Slate)</option>
                      <option value="red">🟥 Solid Red</option>
                      <option value="orange">🟧 Solid Orange</option>
                      <option value="yellow">🟨 Solid Yellow</option>
                      <option value="green">🟩 Solid Green</option>
                      <option value="blue">🟦 Solid Blue</option>
                      <option value="black">⬛ Solid Black</option>
                      <option value="white">⬜ Solid White</option>
                    </select>
                  </div>
                )}

                {/* Properties for Input Nodes */}
                {selectedNode.type === 'input' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="node_input_type" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                        Input Form Type
                      </label>
                      <select
                        id="node_input_type"
                        value={selectedNode.inputType || 'text'}
                        onChange={(e) => onUpdateSelectedNode({ inputType: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="text">Text Field</option>
                        <option value="checkbox">Toggle Checkbox</option>
                        <option value="time">Time Selection</option>
                      </select>
                    </div>
                    {selectedNode.inputType !== 'checkbox' && (
                       <div className="space-y-1">
                          <label htmlFor="node_input_placeholder" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                            Placeholder Text
                          </label>
                          <input
                            id="node_input_placeholder"
                            type="text"
                            value={selectedNode.placeholder || ''}
                            onChange={(e) => onUpdateSelectedNode({ placeholder: e.target.value })}
                            placeholder="e.g. 100 mmHg"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                       </div>
                    )}
                  </div>
                )}
                
                {/* Properties for Table Grid Nodes */}
                {selectedNode.type === 'table' && (
                  <div className="space-y-3">
                     <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                            Table Headers (Comma Separated)
                          </label>
                          <input
                            type="text"
                            value={(selectedNode.tableHeaders || []).join(', ')}
                            onChange={(e) => onUpdateSelectedNode({ tableHeaders: e.target.value.split(',').map(s=>s.trim()) })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                     </div>
                     <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                            Initial Rows (One Row per line, Comma separated)
                          </label>
                          <textarea
                            rows={4}
                            value={(selectedNode.tableRows || []).map(r => r.join(', ')).join('\n')}
                            onChange={(e) => onUpdateSelectedNode({ tableRows: e.target.value.split('\n').map(r => r.split(',').map(s=>s.trim())) })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y"
                          />
                     </div>
                  </div>
                )}

                {/* Properties unique to flow button only */}
                {selectedNode.type === 'button' && (
                  <>
                    {/* Icon Selection Picker */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                        Choose Clinical Icon
                      </label>
                      <div className="grid grid-cols-6 gap-1 bg-white p-2 border border-slate-200 rounded-lg max-h-[85px] overflow-y-auto">
                        {CURATED_MEDICAL_ICONS.map((iconName) => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => onUpdateSelectedNode({ icon: iconName })}
                            className={`p-1 flex items-center justify-center rounded border transition hover:bg-slate-50 ${
                              selectedNode.icon === iconName 
                                ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-900' 
                                : 'border-slate-100 text-slate-600'
                            }`}
                            title={`Set icon: ${iconName}`}
                          >
                            <DynamicIcon name={iconName} className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Speech Vocal Confirmation Settings */}
                    <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="speech_vocal_toggle" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Icons.Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          Vocal Confirmation
                        </label>
                        <input
                          id="speech_vocal_toggle"
                          type="checkbox"
                          checked={selectedNode.vocalConfirmation}
                          onChange={(e) => onUpdateSelectedNode({ vocalConfirmation: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                      </div>
                      {selectedNode.vocalConfirmation && (
                        <div className="space-y-1">
                          <label htmlFor="speech_msg_input" className="block text-[10px] text-slate-400 font-bold uppercase">Spoken Announcement Speech</label>
                          <input
                            id="speech_msg_input"
                            type="text"
                            value={selectedNode.vocalMessage}
                            placeholder="e.g. Epinephrine given, start 3-minute cycle."
                            onChange={(e) => onUpdateSelectedNode({ vocalMessage: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Toggle Mode (Start/Stop State) */}
                    <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="state_toggle_mode" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Icons.ToggleRight className="w-3.5 h-3.5 text-slate-400" />
                          Start/Stop Toggle Mode
                        </label>
                        <input
                          id="state_toggle_mode"
                          type="checkbox"
                          checked={selectedNode.isToggle || false}
                          onChange={(e) => onUpdateSelectedNode({ isToggle: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">If checked, standard actions toggle active states and log "Started" / "Stopped".</p>
                    </div>

                    {/* Pop-up Structured Note Prompt Questions */}
                    <div className="border border-slate-200 bg-white p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="popup_notes_toggle" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Icons.HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          Request Note Popup query
                        </label>
                        <input
                          id="popup_notes_toggle"
                          type="checkbox"
                          checked={selectedNode.hasPrompt}
                          onChange={(e) => onUpdateSelectedNode({ hasPrompt: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                      </div>
                      {selectedNode.hasPrompt && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label htmlFor="prompt_q_input" className="block text-[10px] text-slate-400 font-bold uppercase">Note Query Question</label>
                            <input
                              id="prompt_q_input"
                              type="text"
                              value={selectedNode.promptQuestion}
                              placeholder="e.g. What dose or route was used?"
                              onChange={(e) => onUpdateSelectedNode({ promptQuestion: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="prompt_presets_input" className="block text-[10px] text-slate-400 font-bold uppercase">Quick Selection Answers (One per line)</label>
                            <textarea
                              id="prompt_presets_input"
                              rows={4}
                              value={selectedNode.promptPresetAnswers.join('\n')}
                              placeholder="O-Negative Blood&#10;Fresh Frozen Plasma&#10;Packed Red Cells"
                              onChange={(e) => onUpdateSelectedNode({ 
                                promptPresetAnswers: e.target.value.split('\n')
                              })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none resize-y"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Grid Dimensions & Resizing Block Sliders */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label htmlFor="node_width_edit" className="block text-[10px] font-bold text-slate-400 uppercase">Width Blocks</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateSelectedNode({ width: Math.max(0.5, selectedNode.width - 0.25) })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs text-slate-700 font-bold"
                        id="width_dec_btn"
                      >
                        -
                      </button>
                      <span id="width_value_label" className="text-xs font-semibold text-slate-800">{selectedNode.width}</span>
                      <button
                        onClick={() => onUpdateSelectedNode({ width: Math.min(24, selectedNode.width + 0.25) })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs text-slate-700 font-bold"
                        id="width_inc_btn"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="node_height_edit" className="block text-[10px] font-bold text-slate-400 uppercase">Height Blocks</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateSelectedNode({ height: Math.max(0.5, selectedNode.height - 0.25) })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs text-slate-700 font-bold"
                        id="height_dec_btn"
                      >
                        -
                      </button>
                      <span id="height_value_label" className="text-xs font-semibold text-slate-800">{selectedNode.height}</span>
                      <button
                        onClick={() => onUpdateSelectedNode({ height: Math.min(24, selectedNode.height + 0.25) })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs text-slate-700 font-bold"
                        id="height_inc_btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct quick linkage tool instruction */}
                {selectedNode && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onStartTrackingModeLink(selectedNode.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition mb-2"
                      id="card_link_action"
                    >
                      <Icons.Link className="w-3.5 h-3.5" />
                      Arrow Connector Connection
                    </button>
                    
                    {/* Outgoing Connectors */}
                    {selectedAlgo.connections.filter(c => c.fromId === selectedNode.id).length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outgoing Arrows</label>
                        {selectedAlgo.connections.filter(c => c.fromId === selectedNode.id).map(conn => {
                          const toNode = selectedAlgo.nodes.find(n => n.id === conn.toId);
                          return (
                            <div key={conn.id} className="flex items-center justify-between text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                              <span className="truncate text-slate-600 font-medium pr-2">To: {toNode ? toNode.label : 'Unknown'}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <label className="flex items-center text-[10px] text-slate-500 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="mr-1"
                                    checked={!!conn.isDashed}
                                    onChange={(e) => onUpdateConnection(conn.id, { isDashed: e.target.checked })}
                                  />
                                  Dotted
                                </label>
                                <button
                                  onClick={() => onDeleteConnection(conn.id)}
                                  className="text-slate-400 hover:text-red-600 transition-colors"
                                  title="Remove connection arrow"
                                >
                                  <Icons.X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <p className="text-[10px] text-slate-400 text-center mt-3">
                      Tap the button above then click another block to draw an arrow connector.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 text-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                <Icons.MousePointerSquareDashed className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Select a node or annotation on the flowchart to edit its tags, icons, notes, links or dimensions.</p>
              </div>
            )}

            {/* Save & Publish Options and Link Exports */}
            <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/20 space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">Publish & Offline Sync</h4>
              
              <button
                onClick={handleShareClick}
                className="w-full flex items-center justify-center gap-1.5 py-3 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 hover:border-slate-800 transition shadow-xs cursor-pointer"
                id="share_algo_btn"
              >
                {isShareSuccess ? (
                  <>
                    <Icons.Check className="w-4 h-4 text-emerald-400" />
                    Share Link Copied!
                  </>
                ) : (
                  <>
                    <Icons.Share2 className="w-4 h-4 text-slate-300" />
                    Publish & Copy Share Link
                  </>
                )}
              </button>

              {/* Share link visual display */}
              {shareLink && (
                <div className="text-[10px] font-mono break-all p-2 bg-white/70 border border-slate-100 rounded text-slate-500">
                  {shareLink}
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- PRE-START INSTRUCTION FOR SHARED VIEW --- */}
        {!isIncidentActive && isSharedResource && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
             <div className="bg-blue-100 p-4 rounded-full text-blue-600 shadow-sm animate-bounce-subtle">
                <Icons.ClipboardList className="w-8 h-8" />
             </div>
             <div>
                <h3 className="font-display font-bold text-slate-800 text-lg">Protocol Ready</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Review the flowchart layout. When the clinical event begins, press <strong className="text-emerald-700">Start Incident</strong> at the top to activate interactive tracking and timestamps.
                </p>
             </div>
          </div>
        )}

        {/* --- PROTOCOLS LIBRARY & SAVING TAB --- */}
        {activeTab === 'library' && !isSharedResource && (
          <div className="space-y-6">
            
            {/* Save current draft as custom name to user library */}
            {!isIncidentActive && (
              <form onSubmit={handleSaveLibraryClick} className="space-y-2 border border-slate-200 p-4 rounded-2xl bg-slate-50/45">
                <label htmlFor="algo_library_save_name" className="block text-xs font-bold text-slate-500 uppercase font-display">
                  Save Draft to Local Library
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="algo_library_save_name"
                    type="text"
                    value={customAlgoName}
                    placeholder="Protocol name e.g. Cardiac Arrest"
                    onChange={(e) => setCustomAlgoName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    id="save_algo_library_submit"
                    title="Save protocol"
                  >
                    <Icons.Save className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Loaded Algoritms list */}
            <div className="space-y-4">
              {/* Ready clinical scenarios templates */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display">Loaded Scenarios</span>
                  <button
                    onClick={() => {
                      onLoadTemplate({
                        id: `protocol_${Date.now()}`,
                        name: 'Blank Clinical Protocol',
                        description: 'Custom drafted empty algorithmic layout',
                        nodes: [],
                        connections: [],
                        createdAt: Date.now()
                      });
                      setActiveTab('edit');
                    }}
                    className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                  >
                    <Icons.FilePlus className="w-3 h-3" />
                    New Blank
                  </button>
                </div>
                <div className="space-y-2">
                  {templates.map((temp) => {
                    const isCurrent = selectedAlgo.id === temp.id;
                    return (
                      <div
                        key={temp.id}
                        id={`tpl_select_${temp.id}`}
                        className={`p-3 border rounded-xl hover:bg-slate-52 cursor-pointer transition flex justify-between items-center ${
                          isCurrent ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900' : 'bg-white border-slate-200'
                        }`}
                        onClick={() => onLoadTemplate(temp)}
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 font-display">{temp.name}</h4>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{temp.description}</p>
                        </div>
                        <Icons.ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User specifically saved algorithms list */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-display">My Saved Protocols ({userSavedAlgos.length})</span>
                {userSavedAlgos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">No custom workflows saved yet. Use the block above to save your layout.</p>
                ) : (
                  <div className="space-y-2">
                    {userSavedAlgos.map((algo) => {
                      const isCurrent = selectedAlgo.id === algo.id;
                      return (
                        <div
                          key={algo.id}
                          className={`p-3 border rounded-xl hover:bg-slate-50 transition flex justify-between items-center ${
                            isCurrent ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex-1 cursor-pointer" onClick={() => onLoadTemplate(algo)}>
                            <h4 className="text-xs font-bold text-slate-900 font-display">{algo.name}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Custom Saved</p>
                          </div>
                          <button
                            onClick={() => onDeleteFromLibrary(algo.id)}
                            className="p-1 px-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition rounded ml-2"
                            title="Delete Protocol"
                          >
                            <Icons.Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </aside>
  );
}
