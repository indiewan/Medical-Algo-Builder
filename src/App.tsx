/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { toPng } from 'html-to-image';

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
  const [past, setPast] = useState<MedicalAlgorithm[]>([]);
  const [future, setFuture] = useState<MedicalAlgorithm[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showIpadInstallModal, setShowIpadInstallModal] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleShowModal = () => setShowIpadInstallModal(true);
    window.addEventListener('show-ipad-install-modal', handleShowModal);
    return () => window.removeEventListener('show-ipad-install-modal', handleShowModal);
  }, []);

  const updateAlgoWithHistory = (updateFn: MedicalAlgorithm | ((prev: MedicalAlgorithm) => MedicalAlgorithm)) => {
    setCurrentAlgo((prev) => {
      const nextAlgo = typeof updateFn === 'function' ? updateFn(prev) : updateFn;
      // Simple debounce/throttle could be done, but we assume most actions are atomic
      setPast((p) => [...p, prev]);
      setFuture([]);
      return nextAlgo;
    });
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(past.slice(0, past.length - 1));
    setFuture([currentAlgo, ...future]);
    setCurrentAlgo(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, currentAlgo]);
    setCurrentAlgo(next);
  };

  // App Modes State
  const [isEditMode, setIsEditMode] = useState(true);
  const [isSharedResource, setIsSharedResource] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeId = selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : null;
  const setSelectedNodeId = (id: string | string[] | null) => {
     if (id === null) setSelectedNodeIds([]);
     else if (typeof id === 'string') setSelectedNodeIds([id]);
     else setSelectedNodeIds(id);
  };
  const [searchQuery, setSearchQuery] = useState('');
  
  // Connection states (for visual link drawers)
  const [linkOriginId, setLinkOriginId] = useState<string | null>(null);

  // Active Incident Tracking states
  const [isIncidentActive, setIsIncidentActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [incidentSession, setIncidentSession] = useState<IncidentSession | null>(null);
  const [showTimelineReport, setShowTimelineReport] = useState(false);
  
  // Interaction memory joggers for tracking mode
  const [promptState, setPromptState] = useState<{ isOpen: boolean; question: string; presetAnswers: string[]; nodeRef: string } | null>(null);

  // Node specific active tracking states
  const [pressTimestamps, setPressTimestamps] = useState<{ [nodeId: string]: number }>({});
  const [activeTimers, setActiveTimers] = useState<{ [nodeId: string]: { lastPressedAt: number; counter: string; isExpired?: boolean } }>({});
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});

  // Loaded shared banner state
  const [sharedBannerMessage, setSharedBannerMessage] = useState<string | null>(null);

  // Copy / Paste / Delete via Keyboard
  const [clipboardNodes, setClipboardNodes] = useState<FlowNode[]>([]);
  const [clipboardConnections, setClipboardConnections] = useState<FlowConnection[]>([]);

  useEffect(() => {
    if (!isEditMode || isSharedResource) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
         return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
         updateAlgoWithHistory(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => !selectedNodeIds.includes(n.id)),
            connections: prev.connections.filter(c => !selectedNodeIds.includes(c.fromId) && !selectedNodeIds.includes(c.toId))
         }));
         setSelectedNodeId(null);
      }

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
         if (selectedNodeIds.length > 0) {
            const nodesToCopy = currentAlgo.nodes.filter(n => selectedNodeIds.includes(n.id));
            setClipboardNodes(nodesToCopy);
            
            // Also copy connections between these nodes
            const connsToCopy = currentAlgo.connections.filter(c => selectedNodeIds.includes(c.fromId) && selectedNodeIds.includes(c.toId));
            setClipboardConnections(connsToCopy);
         }
      }

      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
         if (clipboardNodes.length > 0) {
            // Find centroid to offset by grid cells safely
            const minX = Math.min(...clipboardNodes.map(n => n.x));
            const minY = Math.min(...clipboardNodes.map(n => n.y));
            
            // Offset logic (move down right by 1 cell, wrap if out of bounds)
            const idMap = new Map<string, string>();
            const newNodes = clipboardNodes.map(n => {
               const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
               idMap.set(n.id, newId);
               return {
                  ...n,
                  id: newId,
                  x: n.x + 1,
                  y: n.y + 1,
               };
            });
            
            const newConnections = clipboardConnections
              .filter(c => idMap.has(c.fromId) && idMap.has(c.toId))
              .map(c => ({
                 ...c,
                 id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                 fromId: idMap.get(c.fromId)!,
                 toId: idMap.get(c.toId)!
              }));

            updateAlgoWithHistory(prev => ({
               ...prev,
               nodes: [...prev.nodes, ...newNodes],
               connections: [...prev.connections, ...newConnections]
            }));

            setSelectedNodeId(newNodes.map(n => n.id));
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, isSharedResource, selectedNodeIds, currentAlgo, clipboardNodes, clipboardConnections]);

  // Load configuration and parse share links
  useEffect(() => {
    // 1. Load user saved list
    const local = localStorage.getItem('medical_algos_user');
    if (local) {
      try {
        setUserSavedAlgos(JSON.parse(local));
      } catch (e) {
        console.error('Failed to parse local algos');
      }
    }

    // 2. Check URL for shared links
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
  const saveAlgorithmsToLocalStorage = (algos: MedicalAlgorithm[]) => {
    localStorage.setItem('medical_algos_user', JSON.stringify(algos));
    setUserSavedAlgos(algos);
  };

  // Node specific active timer clock loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isIncidentActive) {
      interval = setInterval(() => {
        const now = Date.now();
        const updatedTimers: { [key: string]: { lastPressedAt: number; counter: string; isExpired?: boolean } } = {};
        
        Object.entries(pressTimestamps).forEach(([nodeId, timestamp]) => {
          const node = currentAlgo.nodes.find(n => n.id === nodeId);
          const diffSeconds = Math.floor((now - Number(timestamp)) / 1000);
          let counterStr = "";
          let isExpired = false;

          if (node?.type === 'timer' && node.timerDurationSec && node.timerDurationSec > 0) {
            let remaining = node.timerDurationSec - diffSeconds;
            if (remaining < 0) remaining = 0;
            if (remaining === 0) isExpired = true;
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            counterStr = `${m}:${s.toString().padStart(2, '0')}`;
          } else {
            const m = Math.floor(diffSeconds / 60);
            const s = diffSeconds % 60;
            counterStr = `${m}:${s.toString().padStart(2, '0')}`;
          }

          updatedTimers[nodeId] = {
            lastPressedAt: Number(timestamp),
            counter: counterStr,
            isExpired
          };
        });

        setActiveTimers(updatedTimers);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isIncidentActive, pressTimestamps, currentAlgo.nodes]);

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

  const handleAddNode = (type: FlowNode['type']) => {
    let label = 'Details';
    let width = 5;
    let height = 3;
    let color: FlowNode['color'] = 'slate';
    let icon = 'Activity';
    
    if (type === 'button') { label = 'New Button'; color = 'emerald'; icon = 'Play'; }
    if (type === 'input') { label = 'New Input'; icon = 'PenLine'; }
    if (type === 'table') { label = 'New Table'; width = 12; height = 6; icon = 'Table2'; }
    if (type === 'annotation') { label = 'Annotation'; width = 8; height = 2; icon = 'StickyNote'; }
    if (type === 'panel') { label = 'Panel'; icon = 'Square'; }
    if (type === 'checklist') { label = 'Checklist'; width = 8; height = 5; icon = 'ListChecks'; color = 'slate'; }
    if (type === 'vitals') { label = 'Vitals Tracker'; width = 8; height = 4; icon = 'HeartPulse'; color = 'blue'; }
    if (type === 'medication') { label = 'Medication'; width = 7; height = 4; icon = 'Syringe'; color = 'rose'; }
    if (type === 'timer') { label = 'Timer / Stopwatch'; width = 6; height = 4; icon = 'Timer'; color = 'amber'; }

    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type,
      label,
      icon,
      notes: '',
      vocalConfirmation: false,
      vocalMessage: '',
      hasPrompt: false,
      promptQuestion: '',
      promptPresetAnswers: [],
      x: 5,
      y: 5,
      width,
      height,
      color,
      inputType: type === 'input' ? 'text' : undefined,
      tableHeaders: type === 'table' ? ['Action', 'Time'] : undefined,
      tableRows: type === 'table' ? [['', ''], ['', '']] : undefined,
      checklistItems: type === 'checklist' ? [
        { id: `chk_${Date.now()}_1`, text: 'Check airway' },
        { id: `chk_${Date.now()}_2`, text: 'Confirm IV access' }
      ] : undefined,
      vitalsFields: type === 'vitals' ? {
        showHR: true, showBP: true, showSpO2: true, showRR: true, showTemp: false
      } : undefined,
      medicationOptions: type === 'medication' ? [
        'Epinephrine 1mg IV', 'Amiodarone 300mg IV'
      ] : undefined,
      timerDurationSec: type === 'timer' ? 120 : undefined,
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
       const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
         id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
        id: `conn_${Date.now()}`,
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

  // Load a medical algorithm scenario template
  const handleLoadTemplate = (algo: MedicalAlgorithm) => {
    setCurrentAlgo(JSON.parse(JSON.stringify(algo)));
    setPast([]);
    setFuture([]);
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
    const nextSaved = userSavedAlgos.filter((a) => a.id !== id);
    saveAlgorithmsToLocalStorage(nextSaved);
  };

  // Rename saved scenario
  const handleRenameFromLibrary = (id: string, newName: string) => {
    const nextSaved = userSavedAlgos.map((a) => a.id === id ? { ...a, name: newName } : a);
    saveAlgorithmsToLocalStorage(nextSaved);
  };

  // Native URL compression share builder
  const handlePublishShare = () => {
    return getShareQueryLink(currentAlgo);
  };

  // Export library to JSON file
  const handleExportLibrary = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userSavedAlgos, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `clinical_protocols_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Import library from JSON file
  const handleImportLibrary = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed)) {
          const merged = [...userSavedAlgos];
          let importedCount = 0;
          parsed.forEach((importedAlgo: MedicalAlgorithm) => {
             if (importedAlgo.id && importedAlgo.name && Array.isArray(importedAlgo.nodes)) {
                 importedAlgo.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                 merged.push(importedAlgo);
                 importedCount++;
             }
          });
          saveAlgorithmsToLocalStorage(merged);
          alert(`Successfully imported ${importedCount} protocols.`);
        } else {
          alert('Invalid file format. Must be a JSON array of protocols.');
        }
      } catch (err) {
        alert('Failed to parse file. Ensure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
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
  const handleDataLog = (labelPrefix: string, value: string) => {
    if (!isIncidentActive || !incidentSession) return;
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - incidentSession.startTime) / 1000);
    const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(elapsedSeconds % 60).padStart(2, '0');

    const formattedTime = new Date(now).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const loggedItem: LogEntry = {
      id: `data_log_${Date.now()}`,
      nodeId: 'none',
      nodeLabel: `${labelPrefix}: ${value}`,
      timestamp: formattedTime,
      elapsedTime: elapsedSeconds,
      elapsedFormatted: `${mm}:${ss}`,
    };

    setIncidentSession((prev) => 
      prev ? { ...prev, logs: [...prev.logs, loggedItem] } : null
    );
  };

  const handleNodeClickInTracking = (node: FlowNode) => {
    if (!isIncidentActive || !incidentSession) return;
    
    // Automatically show guidance / memory jogger in the sidebar
    setSelectedNodeId(node.id);

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

  // Add ad-hoc timeline note manually during active simulation
  const handleAdHocNoteSubmit = (note: string) => {
    if (!isIncidentActive || !incidentSession || !note.trim()) return;

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
      id: `ad_hoc_log_${Date.now()}`,
      nodeLabel: "Manual Session Note",
      timestamp: formattedTime,
      elapsedTime: elapsedSeconds,
      elapsedFormatted: `${mm}:${ss}`,
      notes: note.trim(),
    };

    setIncidentSession({
      ...incidentSession,
      logs: [...incidentSession.logs, loggedItem],
    });
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

  const handleStopIncident = async () => {
    if (!incidentSession) return;

    let snapshotDataUrl = undefined;
    try {
      const el = document.getElementById('flowchart-canvas-container');
      if (el) {
         let maxX = 0;
         let maxY = 0;
         if (currentAlgo && currentAlgo.nodes) {
           currentAlgo.nodes.forEach(node => {
             const rightPx = (node.x + node.width) * 100;
             const bottomPx = (node.y + node.height) * 60;
             if (rightPx > maxX) maxX = rightPx;
             if (bottomPx > maxY) maxY = bottomPx;
           });
         }
         
         const trimmedWidth = maxX > 0 ? maxX + 100 : el.offsetWidth;
         const trimmedHeight = maxY > 0 ? maxY + 100 : el.offsetHeight;
         
         snapshotDataUrl = await toPng(el, { 
           backgroundColor: '#f8fafc',
           width: trimmedWidth,
           height: trimmedHeight,
           style: {
             width: `${trimmedWidth}px`,
             height: `${trimmedHeight}px`,
           }
         });
      }
    } catch (e) {
      console.error("Failed to capture proforma image", e);
    }

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
      snapshotDataUrl
    };

    setIncidentSession(finalSession);
    setIsIncidentActive(false);
    setShowTimelineReport(true); // Jump directly to timeline review view
    setPressTimestamps({});
    setActiveTimers({});
    setActiveToggles({});

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
                onChange={(e) => updateAlgoWithHistory((prev) => {
                  if (!prev) return prev;
                  return { ...prev, name: e.target.value };
                })}
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
                onChange={(e) => updateAlgoWithHistory((prev) => {
                  if (!prev) return prev;
                  return { ...prev, description: e.target.value };
                })}
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

        
        {/* Search filter */}
        <div className="relative flex items-center mr-1 md:mr-2 no-print">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-2.5" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-28 md:w-48 transition-all bg-slate-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
            >
              <Icons.X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Undo/Redo & Dark Mode */}
        <div className="flex items-center mr-1 md:mr-2 no-print gap-2">
          {isEditMode && !isSharedResource && (
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-0.5">
              <button
                onClick={handleUndo}
                disabled={past.length === 0}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${past.length > 0 ? 'hover:bg-slate-200 text-slate-700' : 'text-slate-400 cursor-not-allowed'}`}
                title="Undo"
              >
                <Icons.Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={future.length === 0}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${future.length > 0 ? 'hover:bg-slate-200 text-slate-700' : 'text-slate-400 cursor-not-allowed'}`}
                title="Redo"
              >
                <Icons.Redo2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Icons.Sun className="w-4 h-4" /> : <Icons.Moon className="w-4 h-4" />}
          </button>
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
            searchQuery={searchQuery}
            selectedNodeId={selectedNodeId}
            selectedNodeIds={selectedNodeIds}
            linkOriginId={linkOriginId}
            onSelectNode={setSelectedNodeId}
            onUpdateNodeCoordinates={handleUpdateNodeCoordinates}
            onUpdateNodeDimensions={handleUpdateNodeDimensions}
            onNodeClickInTracking={handleNodeClickInTracking}
            onDataLog={handleDataLog}
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
            onAdHocNoteSubmit={handleAdHocNoteSubmit}
            onUpdateSelectedNode={handleUpdateSelectedNode}
            onDeleteSelectedNode={handleDeleteSelectedNode}
            onDuplicateSelectedNode={handleDuplicateSelectedNode}
            onAddNode={handleAddNode}
            onStartTrackingModeLink={handleStartTrackingModeLink}
            onDeleteConnection={handleDeleteConnection}
            onUpdateConnection={handleUpdateConnection}
            templates={MEDICAL_TEMPLATES}
            userSavedAlgos={userSavedAlgos}
            onLoadTemplate={handleLoadTemplate}
            onSaveToLibrary={handleSaveToLibrary}
            onDeleteFromLibrary={handleDeleteFromLibrary}
            onRenameFromLibrary={handleRenameFromLibrary}
            onPublishShare={handlePublishShare}
            onCancelLog={handleCancelLog}
            onExportLibrary={handleExportLibrary}
            onImportLibrary={handleImportLibrary}
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

      {/* iPad Home Screen Install Instructions Modal */}
      {showIpadInstallModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="bg-blue-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-md">
                <Icons.MonitorSmartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold font-display">Install on iPad / iPhone</h3>
              <p className="text-blue-100 text-sm mt-2 opacity-90">Add this protocol to your home screen for quick, offline-capable access.</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-500 mt-0.5 text-sm">1</div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Open the Share Link in Safari</p>
                  <p className="text-xs text-slate-500 mt-1">Make sure you are using Safari on your iPad or iPhone, not an in-app browser.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-500 mt-0.5 text-sm">2</div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Tap the Share button</p>
                  <p className="text-xs text-slate-500 mt-1">Look for the square icon with an arrow pointing up <Icons.Share className="w-3 h-3 inline text-blue-500 mx-1" /> at the top or bottom of your screen.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-500 mt-0.5 text-sm">3</div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Select "Add to Home Screen"</p>
                  <p className="text-xs text-slate-500 mt-1">Scroll down the list of actions until you find the <Icons.PlusSquare className="w-3 h-3 inline text-slate-600 mx-1" /> Add to Home Screen option.</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowIpadInstallModal(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
