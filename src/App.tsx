/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

import { FlowNode, FlowConnection, MedicalAlgorithm, IncidentSession, LogEntry } from './types.ts';
import { MEDICAL_TEMPLATES } from './templates.ts';
import { decodeAlgorithmFromUrl, getShareQueryLink } from './utils/urlState.ts';

import FlowchartCanvas from './components/FlowchartCanvas.tsx';
import Sidebar from './components/Sidebar.tsx';
import PromptModal from './components/PromptModal.tsx';
import IncidentTimeline from './components/IncidentTimeline.tsx';

export default function App() {
  // Loaded algorithms: local user saved list + templates
  const [userSavedAlgos, setUserSavedAlgos] = useState<MedicalAlgorithm[]>([]);
  const [currentAlgo, setCurrentAlgo] = useState<MedicalAlgorithm>(MEDICAL_TEMPLATES[0]);
  
  // App Modes State
  const [isEditMode, setIsEditMode] = useState(true);
  const [isSharedResource, setIsSharedResource] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Connection states (for visual link drawers)
  const [linkOriginId, setLinkOriginId] = useState<string | null>(null);

  // Active Incident Tracking states
  const [isIncidentActive, setIsIncidentActive] = useState(false);
  const [incidentSession, setIncidentSession] = useState<IncidentSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Post-Incident briefing timeline show state (Show timeline report)
  const [showTimelineReport, setShowTimelineReport] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Prompt Modal query state
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    nodeId: string;
    nodeLabel: string;
    question: string;
    presetAnswers: string[];
  } | null>(null);

  // Active individual node timer tracks (e.g., adrenal cyclical triggers MM:SS counters)
  const [pressTimestamps, setPressTimestamps] = useState<{ [nodeId: string]: number }>({});
  const [activeTimers, setActiveTimers] = useState<{ [nodeId: string]: { lastPressedAt: number; counter: string } }>({});
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});

  // Loaded shared banner state
  const [sharedBannerMessage, setSharedBannerMessage] = useState<string | null>(null);

  // Load configuration and parse share links
  useEffect(() => {
    // 1. Load user saved list
    const local = localStorage.getItem('medical_algos_user');
    if (local) {
      try {
        setUserSavedAlgos(JSON.parse(local));
      } catch (err) {
        console.error('Failed to parse user clinical library', err);
      }
    }

    // 2. Parse shared URL algorithm
    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get('algo_share');
    if (sharedCode) {
      const decodedAlgo = decodeAlgorithmFromUrl(sharedCode);
      if (decodedAlgo) {
        setCurrentAlgo(decodedAlgo);
        setSharedBannerMessage(`🔗 Secure Link Load: Shared protocol ready. Edit mode disabled.`);
        setIsEditMode(false);
        setIsSharedResource(true);
      }
    }
  }, []);

  // Sync user saved list with browser LocalStorage
  const saveAlgorithmsToLocalStorage = (updated: MedicalAlgorithm[]) => {
    setUserSavedAlgos(updated);
    localStorage.setItem('medical_algos_user', JSON.stringify(updated));
  };

  // Keep individual counters beating on intervals (once every 1 sec) when track session is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isIncidentActive) {
      interval = setInterval(() => {
        const now = Date.now();
        const nextTimers: { [nodeId: string]: { lastPressedAt: number; counter: string } } = {};
        
        Object.entries(pressTimestamps).forEach(([nodeId, ts]) => {
          const tsNum = ts as number;
          const diffInSec = Math.floor((now - tsNum) / 1000);
          const mm = String(Math.floor(diffInSec / 60)).padStart(2, '0');
          const ss = String(diffInSec % 60).padStart(2, '0');
          nextTimers[nodeId] = {
            lastPressedAt: tsNum,
            counter: `${mm}:${ss}`
          };
        });
        
        setActiveTimers(nextTimers);
      }, 1000);
    } else {
      setActiveTimers({});
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isIncidentActive, pressTimestamps]);

  // Master total clock timer updater for incident logs tracker
  const [masterTimerTicks, setMasterTimerTicks] = useState(0);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isIncidentActive && incidentSession) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - incidentSession.startTime) / 1000);
        setMasterTimerTicks(elapsed);
      }, 1000);
    } else {
      setMasterTimerTicks(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isIncidentActive, incidentSession]);

  const getFormattedMasterTimer = () => {
    const mm = String(Math.floor(masterTimerTicks / 60)).padStart(2, '0');
    const ss = String(masterTimerTicks % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Node adding logic handler
  const handleAddNode = (type: 'button' | 'annotation') => {
    let newY = 0;
    if (currentAlgo.nodes.length > 0) {
      newY = Math.max(...currentAlgo.nodes.map((n) => n.y)) + 2;
    }
    // Stay within max boundaries
    if (newY > 12) newY = 12;

    const defaultTitle = type === 'button' ? 'Treatment/Assessment Step' : 'Remember to check airway guidelines';
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type,
      label: defaultTitle,
      icon: type === 'button' ? 'Activity' : 'AlertCircle',
      x: 4,
      y: newY,
      width: type === 'button' ? 2 : 4,
      height: 2,
      notes: '',
      vocalConfirmation: type === 'button',
      vocalMessage: type === 'button' ? `${defaultTitle} and logging timestamp.` : '',
      hasPrompt: false,
      promptQuestion: '',
      promptPresetAnswers: [],
      color: 'slate',
    };

    setCurrentAlgo({
      ...currentAlgo,
      nodes: [...currentAlgo.nodes, newNode],
    });
    setSelectedNodeId(newNode.id);
  };

  // Node coordinates drag aligner
  const handleUpdateNodeCoordinates = (id: string, x: number, y: number) => {
    setCurrentAlgo({
      ...currentAlgo,
      nodes: currentAlgo.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    });
  };

  // Selected parameters tag updating
  const handleUpdateSelectedNode = (updated: Partial<FlowNode>) => {
    if (!selectedNodeId) return;
    setCurrentAlgo({
      ...currentAlgo,
      nodes: currentAlgo.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...updated } as FlowNode : n)),
    });
  };

  // Node deletion from canvas
  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setCurrentAlgo({
      ...currentAlgo,
      nodes: currentAlgo.nodes.filter((n) => n.id !== selectedNodeId),
      connections: currentAlgo.connections.filter(
        (c) => c.fromId !== selectedNodeId && c.toId !== selectedNodeId
      ),
    });
    setSelectedNodeId(null);
  };

  // Node duplication from canvas
  const handleDuplicateSelectedNode = () => {
    if (!selectedNodeId) return;
    
    const nodeToCopy = currentAlgo.nodes.find(n => n.id === selectedNodeId);
    if (!nodeToCopy) return;

    // determine duplicate spawn coordinates
    let newY = nodeToCopy.y + 2;
    if (newY > 12) newY = 12;

    const newNode: FlowNode = {
      ...nodeToCopy,
      id: `node_${Date.now()}`,
      x: nodeToCopy.x,
      y: newY,
    };

    setCurrentAlgo({
      ...currentAlgo,
      nodes: [...currentAlgo.nodes, newNode],
    });
    setSelectedNodeId(newNode.id);
  };

  // Start linkage line creation tool
  const handleStartTrackingModeLink = (id: string) => {
    setLinkOriginId(id);
  };

  // Complete connect action line arrow
  const handleCompleteLink = (targetId: string) => {
    if (!linkOriginId || linkOriginId === targetId) {
      setLinkOriginId(null);
      return;
    }

    // Check duplicate
    const exists = currentAlgo.connections.some(
      (c) => c.fromId === linkOriginId && c.toId === targetId
    );

    if (!exists) {
      const newConn: FlowConnection = {
        id: `conn_${Date.now()}`,
        fromId: linkOriginId,
        toId: targetId,
      };
      setCurrentAlgo({
        ...currentAlgo,
        connections: [...currentAlgo.connections, newConn],
      });
    }

    setLinkOriginId(null);
  };

  // Drop connection line handle arrow
  const handleDeleteConnection = (connId: string) => {
    setCurrentAlgo({
      ...currentAlgo,
      connections: currentAlgo.connections.filter((c) => c.id !== connId),
    });
  };

  // Load a medical algorithm scenario template
  const handleLoadTemplate = (algo: MedicalAlgorithm) => {
    setCurrentAlgo(JSON.parse(JSON.stringify(algo)));
    setSelectedNodeId(null);
    setLinkOriginId(null);
  };

  // Save current algorithm layouts in user persistent Local Library dictionary
  const handleSaveToLibrary = (name: string) => {
    const newAlgo: MedicalAlgorithm = {
      ...JSON.parse(JSON.stringify(currentAlgo)),
      id: `saved_${Date.now()}`,
      name: `💾 ${name}`,
      createdAt: Date.now(),
    };
    const nextSaved = [...userSavedAlgos, newAlgo];
    saveAlgorithmsToLocalStorage(nextSaved);
  };

  // Delete saved scenario option from local list
  const handleDeleteFromLibrary = (id: string) => {
    if (confirm('Permanently delete this clinical checklist protocol from offline storage?')) {
      const nextSaved = userSavedAlgos.filter((a) => a.id !== id);
      saveAlgorithmsToLocalStorage(nextSaved);
    }
  };

  // Native URL compression share builder
  const handlePublishShare = () => {
    return getShareQueryLink(currentAlgo);
  };

  // --- PLAY/TRACKING SIMULATION RUN WORKFLOW ---

  // Start Active Emergency incident tracking session
  const handleStartIncident = () => {
    const startMs = Date.now();
    const formattedDate = new Date(startMs).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const initLog: LogEntry = {
      id: `log_init_${Date.now()}`,
      nodeLabel: '🟢 INCIDENT CODE STARTED',
      timestamp: formattedDate,
      elapsedTime: 0,
      elapsedFormatted: '00:00',
      isSystemEvent: true,
    };

    const newSession: IncidentSession = {
      id: `session_${Date.now()}`,
      algorithmId: currentAlgo.id,
      algorithmName: currentAlgo.name,
      startTime: startMs,
      isActive: true,
      logs: [initLog],
    };

    setIncidentSession(newSession);
    setPressTimestamps({});
    setActiveTimers({});
    setActiveToggles({});
    setIsIncidentActive(true);
    setShowTimelineReport(false);

    // Vocal Speech start sound
    speakVocalFeedback(`${currentAlgo.name} tracking session activated.`);
  };

  // Voice vocal synthesis prompter
  const speakVocalFeedback = (text: string) => {
    if (isMuted || !text) return;
    try {
      // Cancel typical speech overlays
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // professional paced readability
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis fail/restrained by sandbox policy: ', e);
    }
  };

  // Clicking an active process step button during logging code
  const handleNodeClickInTracking = (node: FlowNode) => {
    if (!isIncidentActive || !incidentSession) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - incidentSession.startTime) / 1000);
    const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(elapsedSeconds % 60).padStart(2, '0');

    const formattedTime = new Date(now).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let isTogglingOn = false;
    let logLabel = node.label;
    
    if (node.isToggle) {
      const isCurrentlyActive = !!activeToggles[node.id];
      isTogglingOn = !isCurrentlyActive;
      setActiveToggles((prev) => ({ ...prev, [node.id]: isTogglingOn }));
      logLabel = `${isTogglingOn ? 'Started' : 'Stopped'}: ${node.label}`;
    }

    // Speak vocal confirmation immediately if enabled
    if (node.vocalConfirmation) {
      if (node.isToggle) {
         speakVocalFeedback(node.vocalMessage ? `${isTogglingOn ? 'Started' : 'Stopped'} ${node.vocalMessage}` : `${logLabel}`);
      } else {
         speakVocalFeedback(node.vocalMessage || `${node.label} recorded.`);
      }
    }

    // Capture click timestamp for epinephrine/cpr repetitive counter indicators
    setPressTimestamps((p) => ({
      ...p,
      [node.id]: now,
    }));

    // Check if the node requests an interactive pop-up note query (e.g. asking what blood, epinephrine dose etc)
    if (node.hasPrompt) {
      setPromptState({
        isOpen: true,
        nodeId: node.id,
        nodeLabel: logLabel,
        question: node.promptQuestion,
        presetAnswers: node.promptPresetAnswers || [],
      });
    } else {
      // Directly log standard action item
      const logItem: LogEntry = {
        id: `action_log_${Date.now()}`,
        nodeId: node.id,
        nodeLabel: logLabel,
        timestamp: formattedTime,
        elapsedTime: elapsedSeconds,
        elapsedFormatted: `${mm}:${ss}`,
      };

      setIncidentSession({
        ...incidentSession,
        logs: [...incidentSession.logs, logItem],
      });
    }
  };

  // Submit Answer from interactive Clinical Notes prompt modal
  const handlePromptSubmit = (answer: string) => {
    if (!promptState || !incidentSession) return;

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - incidentSession.startTime) / 1000);
    const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(elapsedSeconds % 60).padStart(2, '0');

    const formattedTime = new Date(now).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const loggedItem: LogEntry = {
      id: `action_log_${Date.now()}`,
      nodeId: promptState.nodeId,
      nodeLabel: promptState.nodeLabel,
      timestamp: formattedTime,
      elapsedTime: elapsedSeconds,
      elapsedFormatted: `${mm}:${ss}`,
      notes: answer,
    };

    setIncidentSession({
      ...incidentSession,
      logs: [...incidentSession.logs, loggedItem],
    });

    setPromptState(null);
  };

  // Stop Active Emergency tracking and generate chronologic briefing timeline
  const handleCancelLog = (logId: string) => {
    if (!incidentSession) return;
    
    setIncidentSession({
      ...incidentSession,
      logs: incidentSession.logs.map(log => 
        log.id === logId ? { ...log, isAccidental: true, nodeLabel: `[CANCELLED] ${log.nodeLabel}` } : log
      )
    });
  };

  const handleStopIncident = () => {
    if (!incidentSession) return;

    const stopMs = Date.now();
    const formattedDate = new Date(stopMs).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const stopElapsed = Math.floor((stopMs - incidentSession.startTime) / 1000);
    const mm = String(Math.floor(stopElapsed / 60)).padStart(2, '0');
    const ss = String(stopElapsed % 60).padStart(2, '0');

    const finalLog: LogEntry = {
      id: `log_stop_${Date.now()}`,
      nodeLabel: '🛑 INCIDENT CODE STOPPED',
      timestamp: formattedDate,
      elapsedTime: stopElapsed,
      elapsedFormatted: `${mm}:${ss}`,
      isSystemEvent: true,
    };

    const finalSession: IncidentSession = {
      ...incidentSession,
      stopTime: stopMs,
      isActive: false,
      logs: [...incidentSession.logs, finalLog],
    };

    setIncidentSession(finalSession);
    setIsIncidentActive(false);
    setShowTimelineReport(true); // Jump directly to timeline review view

    speakVocalFeedback('Incident stopped. Timeline briefing generated.');
  };

  // Exit timeline and restart tracking app
  const handleRestartIncidentTracker = () => {
    setShowTimelineReport(false);
    setIncidentSession(null);
  };

  // Copy linear medical markdown audit to clipboard
  const handleCopyMarkdownReport = () => {
    if (!incidentSession) return;

    const durationSec = incidentSession.stopTime 
      ? Math.floor((incidentSession.stopTime - incidentSession.startTime) / 1000)
      : Math.floor((Date.now() - incidentSession.startTime) / 1000);
    const minStr = String(Math.floor(durationSec / 60)).padStart(2, '0');
    const secStr = String(durationSec % 60).padStart(2, '0');

    let md = `# CLINICAL INTERVENTION TIMELINE REPORT\n`;
    md += `**Case Reference ID**: ${incidentSession.id}\n`;
    md += `**Target Protocol Check**: ${incidentSession.algorithmName}\n`;
    md += `**Date**: ${new Date(incidentSession.startTime).toLocaleDateString()}\n`;
    md += `**Code Duration**: ${minStr}:${secStr}\n\n`;

    md += `## CHRONOLOGICAL CLINICAL ACTIONS LOG\n`;
    incidentSession.logs.filter(l => !l.isSystemEvent).forEach((log) => {
      md += `- **+${log.elapsedFormatted}** (${log.timestamp}) - **${log.nodeLabel}**\n`;
      if (log.notes) {
        md += `  *Note recorded*: ${log.notes}\n`;
      }
    });

    md += `\n*End of Clinical Record. Digitally signed via Mobile Code Tracker.*`;

    navigator.clipboard.writeText(md);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const selectedNode = currentAlgo.nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="min-h-screen bg-slate-50 text-[#0f172a] font-sans flex flex-col antialiased">
      
      {/* Shared url confirmation alert banner bar */}
      {sharedBannerMessage && (
        <div className="no-print bg-emerald-600 text-white font-semibold text-xs py-2.5 px-4 shadow-sm flex justify-between items-center z-40 relative">
          <span className="flex items-center gap-1.5 font-display">
            <Icons.Sparkles className="w-4 h-4 shrink-0" />
            {sharedBannerMessage}
          </span>
          <button 
            onClick={() => setSharedBannerMessage(null)} 
            className="text-white hover:text-emerald-100 p-0.5 rounded transition font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* --- CLINICAL HEAD ACTION ACTIONS BAR --- */}
      <header className="no-print bg-white border-b border-slate-200 px-6 py-3.5 shrink-0 shadow-sm z-30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Title and Editable details */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm flex items-center justify-center shrink-0">
            <Icons.Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            {isEditMode && !isSharedResource ? (
              <input
                type="text"
                value={currentAlgo.name}
                id="algo_name_title_edit"
                onChange={(e) => setCurrentAlgo({ ...currentAlgo, name: e.target.value })}
                className="font-display font-bold text-lg text-slate-800 border-b border-dashed border-slate-300 hover:border-slate-500 focus:outline-none focus:border-slate-900 w-full bg-transparent max-w-[280px] sm:max-w-[420px]"
                title="Click to rename clinical protocol"
              />
            ) : (
              <h1 className="font-display font-bold text-lg text-slate-800 truncate">
                {currentAlgo.name}
              </h1>
            )}
            {isEditMode && !isSharedResource ? (
              <input
                type="text"
                value={currentAlgo.description || ''}
                id="algo_desc_edit"
                onChange={(e) => setCurrentAlgo({ ...currentAlgo, description: e.target.value })}
                className="text-xs text-slate-500 mt-0.5 border-b border-dashed border-slate-300 hover:border-slate-500 focus:outline-none focus:border-slate-900 w-full bg-transparent max-w-[280px] sm:max-w-[420px]"
                title="Click to edit clinical protocol description"
                placeholder="Interactive clinical rescue checklist."
              />
            ) : (
              <p className="text-xs text-slate-500 mt-0.5 max-w-md truncate">
                {currentAlgo.description || 'Interactive clinical rescue checklist.'}
              </p>
            )}
          </div>
        </div>

        {/* Start / Stop tracking clinical incident modules */}
        <div className="flex items-center gap-3 w-full md:w-auto md:justify-end">
          
          {/* Main Play Tracking mode vs Edit blueprints mode toggle */}
          {!isSharedResource && (
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => {
                  if (isIncidentActive) {
                    alert('Please stop the current active tracking incident session before changing editor mode.');
                    return;
                  }
                  setIsEditMode(true);
                  setShowTimelineReport(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isEditMode
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="mode_toggle_blueprint"
              >
                <Icons.Wrench className="w-3.5 h-3.5" />
                Blueprint Designer
              </button>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setShowTimelineReport(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isEditMode
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="mode_toggle_tracking"
              >
                <Icons.Play className="w-3.5 h-3.5" />
                Incident Tracker
              </button>
            </div>
          )}

          {!isEditMode && (
            <div className="flex items-center gap-3">
              {/* Tracker start/stop trigger button actions */}
              {!isIncidentActive ? (
                <button
                  onClick={handleStartIncident}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-97 shrink-0 cursor-pointer"
                  id="incident_start_btn"
                >
                  <Icons.PlayCircle className="w-4 h-4" />
                  Start Incident
                </button>
              ) : (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full border border-red-100 font-mono text-sm font-bold shadow-sm">
                    <span className="animate-pulse h-2 w-2 rounded-full bg-red-600"></span>
                    <span>{getFormattedMasterTimer()}</span>
                  </div>
                  <button
                    onClick={handleStopIncident}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer active:scale-95"
                    id="incident_stop_btn"
                  >
                    <Icons.StopCircle className="w-4 h-4 text-white" />
                    STOP & EXPORT
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </header>

      {/* --- PRIMARY MAIN PAGE VIEWPORT AREA --- */}
      {showTimelineReport && incidentSession ? (
        // Render detailed chronological briefing page
        <IncidentTimeline
          session={incidentSession}
          onRestart={handleRestartIncidentTracker}
          onCopyReport={handleCopyMarkdownReport}
          isCopied={isCopied}
        />
      ) : (
        // Normal Canvas & Sidebar View Mode
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 bg-slate-50 overflow-hidden relative">
          
          {/* Main surgical grid alignment canvas */}
          <FlowchartCanvas
            nodes={currentAlgo.nodes}
            connections={currentAlgo.connections}
            isEditMode={isEditMode}
            isSharedResource={isSharedResource}
            isIncidentActive={isIncidentActive}
            selectedNodeId={selectedNodeId}
            linkOriginId={linkOriginId}
            onSelectNode={setSelectedNodeId}
            onUpdateNodeCoordinates={handleUpdateNodeCoordinates}
            onNodeClickInTracking={handleNodeClickInTracking}
            onStartTrackingModeLink={handleStartTrackingModeLink}
            onCompleteLink={handleCompleteLink}
            onDeleteConnection={handleDeleteConnection}
            activeTimers={activeTimers}
            activeToggles={activeToggles}
          />

          {/* Settings / Config clinical sidebar */}
          <Sidebar
            isEditMode={isEditMode}
            isSharedResource={isSharedResource}
            selectedNode={selectedNode}
            selectedAlgo={currentAlgo}
            isIncidentActive={isIncidentActive}
            activeLogs={incidentSession?.logs.filter(l => !l.isSystemEvent) || []}
            isMuted={isMuted}
            onSetMuted={setIsMuted}
            onUpdateSelectedNode={handleUpdateSelectedNode}
            onDeleteSelectedNode={handleDeleteSelectedNode}
            onDuplicateSelectedNode={handleDuplicateSelectedNode}
            onAddNode={handleAddNode}
            onStartTrackingModeLink={handleStartTrackingModeLink}
            templates={MEDICAL_TEMPLATES}
            userSavedAlgos={userSavedAlgos}
            onLoadTemplate={handleLoadTemplate}
            onSaveToLibrary={handleSaveToLibrary}
            onDeleteFromLibrary={handleDeleteFromLibrary}
            onPublishShare={handlePublishShare}
            onCancelLog={handleCancelLog}
          />

        </div>
      )}

      {/* Interactive Logs Dialogue notes pop-up queries */}
      <PromptModal
        isOpen={promptState?.isOpen || false}
        question={promptState?.question || ''}
        presetAnswers={promptState?.presetAnswers || []}
        onSubmit={handlePromptSubmit}
        onClose={() => setPromptState(null)}
      />

    </div>
  );
}
