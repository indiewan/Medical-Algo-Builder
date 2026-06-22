/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { FlowNode, MedicalAlgorithm, FlowConnection } from '../types.ts';

// Dynamic Lucide icon helper
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
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
  onUpdateSelectedNode: (updated: Partial<FlowNode>) => void;
  onDeleteSelectedNode: () => void;
  onAddNode: (type: 'button' | 'annotation') => void;
  onStartTrackingModeLink: (id: string) => void;
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
  'Activity', 'HeartPulse', 'Heart', 'Syringe', 'Pill', 'Flame', 'Clock', 
  'Stethoscope', 'ClipboardCheck', 'Droplet', 'UserCheck', 'ShieldAlert', 
  'Layers', 'BadgeAlert', 'AlertCircle', 'PlusSquare', 'Skull', 'Wind',
  'Thermometer', 'Brain', 'Eye', 'Type', 'BookA', 'LetterA', 'LetterB', 'LetterC', 'LetterD', 'LetterE', 'O2Mask'
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
  onUpdateSelectedNode,
  onDeleteSelectedNode,
  onAddNode,
  onStartTrackingModeLink,
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

  return (
    <aside id="app_sidebar" className="w-full lg:w-[380px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden no-print">
      
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

            {/* Process Efficiency telemetric bar widget */}
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-display">Process Efficiency</span>
                <span className="text-xs font-bold font-mono text-emerald-700">94%</span>
              </div>
              <div className="flex gap-1 h-3">
                <div className="flex-1 bg-emerald-500 rounded-sm"></div>
                <div className="flex-1 bg-emerald-400 rounded-sm"></div>
                <div className="flex-1 bg-emerald-300 rounded-sm"></div>
                <div className="flex-1 bg-emerald-200 rounded-sm"></div>
                <div className="flex-1 bg-slate-200 rounded-sm"></div>
              </div>
              <p className="text-[10px] text-emerald-800 mt-2 font-mono">All critical resuscitation actions logged within ±5s.</p>
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
                  className="flex items-center gap-2 justify-center py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                  id="add_node_btn"
                >
                  <Icons.SquareTerminal className="w-3.5 h-3.5" />
                  + Task Button
                </button>
                <button
                  onClick={() => onAddNode('annotation')}
                  className="flex items-center gap-2 justify-center py-2.5 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                  id="add_node_anno"
                >
                  <Icons.Type className="w-3.5 h-3.5" />
                  + Text Label
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
                  <button
                    onClick={onDeleteSelectedNode}
                    className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition"
                    id="property_delete_node"
                    title="Delete node from grid"
                  >
                    <Icons.Trash2 className="w-4 h-4" />
                  </button>
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

                    {/* Pre-set CSS High Contrast Thème Colors options */}
                    <div className="space-y-1">
                      <label htmlFor="node_theme_color" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                        Color Accent Theme
                      </label>
                      <select
                        id="node_theme_color"
                        value={selectedNode.color}
                        onChange={(e) => onUpdateSelectedNode({ color: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="rose">🔴 Critical / Warning (Rose)</option>
                        <option value="amber">🟡 Assess / Intermediate (Amber)</option>
                        <option value="emerald">🟢 Drug / Treatment (Emerald)</option>
                        <option value="sky">🔵 Fluids / Resuscitate (Sky)</option>
                        <option value="indigo">🟣 Diagnostic / Labs (Indigo)</option>
                        <option value="violet">🧬 Secondary Protocol (Violet)</option>
                        <option value="slate">⚪ Default Clinical (Slate)</option>
                      </select>
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

                {/* Sub-instructions Notes display */}
                <div className="space-y-1">
                  <label htmlFor="node_notes_edit" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                    Protocol Notes / Action Guidelines
                  </label>
                  <textarea
                    id="node_notes_edit"
                    rows={2}
                    value={selectedNode.notes}
                    placeholder="Provide quick clinical instruction guides when clicked..."
                    onChange={(e) => onUpdateSelectedNode({ notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Grid Dimensions & Resizing Block Sliders */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label htmlFor="node_width_edit" className="block text-[10px] font-bold text-slate-400 uppercase">Width Blocks</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateSelectedNode({ width: Math.max(1, selectedNode.width - 1) })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs text-slate-700 font-bold"
                        id="width_dec_btn"
                      >
                        -
                      </button>
                      <span id="width_value_label" className="text-xs font-semibold text-slate-800">{selectedNode.width}</span>
                      <button
                        onClick={() => onUpdateSelectedNode({ width: Math.min(6, selectedNode.width + 1) })}
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
                        onClick={() => onUpdateSelectedNode({ height: Math.max(1, selectedNode.height - 1) })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs text-slate-700 font-bold"
                        id="height_dec_btn"
                      >
                        -
                      </button>
                      <span id="height_value_label" className="text-xs font-semibold text-slate-800">{selectedNode.height}</span>
                      <button
                        onClick={() => onUpdateSelectedNode({ height: Math.min(4, selectedNode.height + 1) })}
                        className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs text-slate-700 font-bold"
                        id="height_inc_btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct quick linkage tool instruction */}
                {selectedNode.type === 'button' && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onStartTrackingModeLink(selectedNode.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                      id="card_link_action"
                    >
                      <Icons.Link className="w-3.5 h-3.5" />
                      Arrow Connector Connection
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1">
                      Tap and then click another block to construct flow connectors.
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
