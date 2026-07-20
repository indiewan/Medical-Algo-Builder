const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const prefix = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
  const [incidentSession, setIncidentSession] = useState<IncidentSession | null>(null);
  const [showTimelineReport, setShowTimelineReport] = useState(false);
  
  // Interaction memory joggers for tracking mode
  const [promptState, setPromptState] = useState<{ isOpen: boolean; question: string; presetAnswers: string[]; nodeRef: string } | null>(null);

  // Node specific active tracking states
  const [pressTimestamps, setPressTimestamps] = useState<{ [nodeId: string]: number }>({});
  const [activeTimers, setActiveTimers] = useState<{ [nodeId: string]: { lastPressedAt: number; counter: string } }>({});
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
               const newId = \`node_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`;
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
                 id: \`conn_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
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
        setSharedBannerMessage(\`🔗 Secure Link Load: Shared protocol ready. Edit mode disabled.\`);
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
        const updatedTimers: { [key: string]: { lastPressedAt: number; counter: string } } = {};
        
        Object.entries(pressTimestamps).forEach(([nodeId, timestamp]) => {
          const diffSeconds = Math.floor((now - timestamp) / 1000);
          const m = Math.floor(diffSeconds / 60);
          const s = diffSeconds % 60;
          updatedTimers[nodeId] = {
            lastPressedAt: timestamp,
            counter: \`\${m}:\${s.toString().padStart(2, '0')}\`
          };
        });

        setActiveTimers(updatedTimers);
      }, 1000);
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
    return \`\${mm}:\${ss}\`;
  };

`;

content = prefix + content;
fs.writeFileSync('src/App.tsx', content, 'utf-8');
