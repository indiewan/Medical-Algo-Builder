/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalAlgorithm } from './types.ts';

export const MEDICAL_TEMPLATES: MedicalAlgorithm[] = [
  {
    id: 'acls_cardiac_arrest',
    name: '🔴 ACLS Cardiac Arrest Protocol',
    description: 'Advanced Cardiac Life Support algorithm for adults with Shockable (VF/pVT) and Non-Shockable (Asystole/PEA) rhythms.',
    createdAt: 1771123200000,
    nodes: [
      {
        id: 'node_start_cpr',
        type: 'button',
        label: '⚡ START CPR (30:2)',
        icon: 'Activity',
        x: 4,
        y: 0,
        width: 3,
        height: 1,
        notes: 'Give oxygen. Attach monitor / defibrillator. Continuous compressions if intubated.',
        vocalConfirmation: true,
        vocalMessage: 'C P R started. Ensure high quality compressions.',
        hasPrompt: false,
        promptQuestion: '',
        promptPresetAnswers: [],
        color: 'rose'
      },
      {
        id: 'node_rhythm',
        type: 'button',
        label: '🔍 Assess Rhythm (Shockable?)',
        icon: 'Stethoscope',
        x: 4,
        y: 2,
        width: 3,
        height: 1,
        notes: 'Check for pulse & rhythm. Shockable: VF / pVT. Non-shockable: PEA / Asystole.',
        vocalConfirmation: true,
        vocalMessage: 'Assess rhythm. Rhythm check now.',
        hasPrompt: true,
        promptQuestion: 'What is the assessed cardiac rhythm?',
        promptPresetAnswers: ['VF / pulseless VT (Shockable)', 'Asystole (Non-Shockable)', 'PEA (Non-Shockable)', 'ROSC Achieved!'],
        color: 'amber'
      },
      // Shockable Path (Left side)
      {
        id: 'node_shock_1',
        type: 'button',
        label: '⚡ Deliver Shock (120-200 J)',
        icon: 'Flame',
        x: 1,
        y: 4,
        width: 3,
        height: 1,
        notes: 'Deliver single unsynchronized shock. Immediately resume CPR for 2 minutes.',
        vocalConfirmation: true,
        vocalMessage: 'Shock delivered. Resume CPR immediately.',
        hasPrompt: false,
        promptQuestion: '',
        promptPresetAnswers: [],
        color: 'rose'
      },
      {
        id: 'node_epi_shock',
        type: 'button',
        label: '💉 Epinephrine 1mg IV/IO',
        icon: 'Syringe',
        x: 1,
        y: 6,
        width: 3,
        height: 1,
        notes: 'Repeat Epinephrine 1mg every 3 to 5 minutes.',
        vocalConfirmation: true,
        vocalMessage: 'Adrenaline administered.',
        hasPrompt: true,
        promptQuestion: 'What was the epinephrine route and dose?',
        promptPresetAnswers: ['1mg IV Push', '1mg IO Push', 'Dose deferred'],
        color: 'emerald'
      },
      {
        id: 'node_amio',
        type: 'button',
        label: '💊 Amiodarone 300mg IV/IO',
        icon: 'Pill',
        x: 1,
        y: 8,
        width: 3,
        height: 1,
        notes: 'First dose 300mg. Second dose 150mg. Alternatively (Lidocaine 1-1.5 mg/kg).',
        vocalConfirmation: true,
        vocalMessage: 'Anti-arrhythmic administered.',
        hasPrompt: true,
        promptQuestion: 'Which anti-arrhythmic was given?',
        promptPresetAnswers: ['Amiodarone 300mg', 'Amiodarone 150mg', 'Lidocaine 100mg', 'Lidocaine 50mg'],
        color: 'indigo'
      },
      // Non-Shockable Path (Right side)
      {
        id: 'node_epi_non_shock',
        type: 'button',
        label: '💉 Epinephrine 1mg ASAP',
        icon: 'Syringe',
        x: 7,
        y: 4,
        width: 3,
        height: 1,
        notes: 'Give Epinephrine as soon as possible, then repeat every 3 to 5 minutes.',
        vocalConfirmation: true,
        vocalMessage: 'Epinephrine given immediately for PEA Asystole.',
        hasPrompt: false,
        promptQuestion: '',
        promptPresetAnswers: [],
        color: 'emerald'
      },
      {
        id: 'node_cpr_non_shock',
        type: 'button',
        label: '⏳ CPR 2 Min + Access',
        icon: 'Clock',
        x: 7,
        y: 6,
        width: 3,
        height: 1,
        notes: 'Treat reversible causes (H\'s and T\'s). Check rhythm every 2 minutes.',
        vocalConfirmation: false,
        vocalMessage: '',
        hasPrompt: true,
        promptQuestion: 'Any suspected reversible causes (H\'s & T\'s)?',
        promptPresetAnswers: ['Hypovolemia', 'Hypoxia', 'Hydrogen ion (Acidosis)', 'Hypo/Hyperkalemia', 'Tension Pneumothorax', 'Thrombosis (Cardiac/Pulmonary)'],
        color: 'sky'
      },
      // Shared annotations or text
      {
        id: 'node_anno_hs_ts',
        type: 'annotation',
        label: '⚠️ REMEMBER REVERSIBLE CAUSES:\nHypovolemia, Hypoxia, Acidosis, Hypo/Hyperkalemia, Hypothermia, Tension Pneumothorax, Tamponade, Toxins, Thrombosis.',
        icon: 'ClipboardCheck',
        x: 4,
        y: 10,
        width: 5,
        height: 1,
        notes: '',
        vocalConfirmation: false,
        vocalMessage: '',
        hasPrompt: false,
        promptQuestion: '',
        promptPresetAnswers: [],
        color: 'slate'
      }
    ],
    connections: [
      { id: 'conn_start_to_rhythm', fromId: 'node_start_cpr', toId: 'node_rhythm' },
      // Shockable Left Branch
      { id: 'conn_rhythm_to_shock1', fromId: 'node_rhythm', toId: 'node_shock_1' },
      { id: 'conn_shock1_to_epi', fromId: 'node_shock_1', toId: 'node_epi_shock' },
      { id: 'conn_epi_to_amio', fromId: 'node_epi_shock', toId: 'node_amio' },
      { id: 'conn_amio_back_to_rhythm', fromId: 'node_amio', toId: 'node_rhythm' },
      // Non-Shockable Right Branch
      { id: 'conn_rhythm_to_epi_ns', fromId: 'node_rhythm', toId: 'node_epi_non_shock' },
      { id: 'conn_epi_ns_to_cpr_ns', fromId: 'node_epi_non_shock', toId: 'node_cpr_non_shock' },
      { id: 'conn_cpr_ns_back_to_rhythm', fromId: 'node_cpr_non_shock', toId: 'node_rhythm' }
    ]
  }
];

