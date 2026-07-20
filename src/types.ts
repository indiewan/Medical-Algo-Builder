/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NodeType = 'button' | 'annotation' | 'panel' | 'input' | 'table' | 'checklist' | 'vitals' | 'medication' | 'timer';

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  placeholder?: string;
  icon: string; // Lucide icon name
  x: number; // Grid column index (0-based)
  y: number; // Grid row index (0-based)
  width: number; // Width in grid columns
  height: number; // Height in grid rows
  notes: string; // Explanatory instructions shown on expand
  vocalConfirmation: boolean;
  vocalMessage: string; // Customized speech synthesis message
  hasPrompt: boolean; // Triggers structured popup notes when pressed
  promptQuestion: string; // Multi-choice and custom text input query
  promptPresetAnswers: string[]; // Quick selections
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  isBold?: boolean;
  color: 'emerald' | 'amber' | 'rose' | 'sky' | 'indigo' | 'slate' | 'violet' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'black' | 'white';
  isToggle?: boolean; // If true, node acts as a Start/Stop toggle
  // Panel specific
  panelOpacity?: number; // 0 to 100
  // Input specific
  inputType?: 'text' | 'time' | 'checkbox';
  // Table specific
  tableHeaders?: string[];
  tableRows?: string[][];
  // Checklist specific
  checklistItems?: { id: string; text: string }[];
  // Vitals specific
  vitalsFields?: { showHR?: boolean; showBP?: boolean; showSpO2?: boolean; showRR?: boolean; showTemp?: boolean };
  // Medication specific
  medicationOptions?: string[];
  // Timer specific
  timerDurationSec?: number; // Pre-configured countdown duration, or 0 for stopwatch
}

export interface FlowConnection {
  id: string;
  fromId: string;
  toId: string;
  isDashed?: boolean;
}

export interface MedicalAlgorithm {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  createdAt: number;
}

export interface LogEntry {
  id: string;
  nodeId?: string;
  nodeLabel: string;
  timestamp: string; // Actual time of day e.g. "12:45:03 PM"
  elapsedTime: number; // Seconds since incident start
  elapsedFormatted: string; // Elapsed time formatted as "01:45" (MM:SS)
  notes?: string; // Prompt answers or custom annotations
  isSystemEvent?: boolean; // E.g. "Incident Started", "Incident Stopped"
  isAccidental?: boolean; // True if marked as accidental press
}

export interface IncidentSession {
  id: string;
  algorithmId: string;
  algorithmName: string;
  startTime: number; // Timestamp
  stopTime?: number; // Timestamp
  isActive: boolean;
  logs: LogEntry[];
  snapshotDataUrl?: string; // Image export of the chart
}
