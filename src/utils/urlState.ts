/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import LZString from 'lz-string';
import { MedicalAlgorithm, FlowNode, FlowConnection } from '../types.ts';

// Minify by stripping defaults and renaming keys to short aliases
function minifyAlgorithm(algo: MedicalAlgorithm): any {
  const minified: any = {
    i: algo.id,
    n: algo.name,
    nd: algo.nodes.map(node => {
      const mn: any = {
        i: node.id,
        x: node.x,
        y: node.y,
        l: node.label,
        t: node.type === 'button' ? 'b' : 'a'
      };
      if (node.width !== 4) mn.w = node.width;
      if (node.height !== 2) mn.h = node.height;
      if (node.notes) mn.nt = node.notes;
      if (node.icon && node.icon !== 'None') mn.ic = node.icon;
      if (node.hasPrompt) mn.hp = 1;
      if (node.promptQuestion) mn.pq = node.promptQuestion;
      if (node.promptPresetAnswers && node.promptPresetAnswers.length > 0) mn.ppa = node.promptPresetAnswers;
      if (node.fontSize && node.fontSize !== 'base') mn.fs = node.fontSize;
      if (node.isBold) mn.ib = 1;
      if (node.color && node.color !== 'slate') mn.c = node.color;
      if (node.isToggle) mn.it = 1;
      if (node.placeholder) mn.ph = node.placeholder;
      if (node.vocalConfirmation) mn.vc = 1;
      if (node.vocalMessage) mn.vm = node.vocalMessage;
      return mn;
    }),
    cn: algo.connections ? algo.connections.map(conn => {
      const mc: any = {
        i: conn.id,
        f: conn.fromId,
        t: conn.toId
      };
      return mc;
    }) : []
  };
  if (algo.description) minified.d = algo.description;
  if (algo.createdAt) minified.ca = algo.createdAt;
  
  return minified;
}

// Expand short aliases and restore default values
function expandAlgorithm(minified: any): MedicalAlgorithm {
  const algo: MedicalAlgorithm = {
    id: minified.i || `session_${Date.now()}`,
    name: minified.n || 'Shared Protocol',
    description: minified.d || '',
    nodes: [],
    connections: [],
    createdAt: minified.ca || Date.now()
  };

  if (Array.isArray(minified.nd)) {
    algo.nodes = minified.nd.map((mNode: any) => {
      const node: FlowNode = {
        id: mNode.i || `node_${Math.random()}`,
        x: mNode.x || 0,
        y: mNode.y || 0,
        width: mNode.w || 4,
        height: mNode.h || 2,
        label: mNode.l || '',
        notes: mNode.nt || '',
        type: mNode.t === 'a' ? 'annotation' : 'button',
        icon: mNode.ic || 'None',
        hasPrompt: !!mNode.hp,
        promptQuestion: mNode.pq || '',
        promptPresetAnswers: mNode.ppa || [],
        fontSize: mNode.fs || 'base',
        isBold: !!mNode.ib,
        color: mNode.c || 'slate',
        isToggle: !!mNode.it,
        placeholder: mNode.ph || undefined,
        vocalConfirmation: !!mNode.vc,
        vocalMessage: mNode.vm || ''
      };
      return node;
    });
  }

  if (Array.isArray(minified.cn)) {
    algo.connections = minified.cn.map((mConn: any) => {
      const conn: FlowConnection = {
        id: mConn.i || `conn_${Math.random()}`,
        fromId: mConn.f || '',
        toId: mConn.t || ''
      };
      return conn;
    });
  }

  return algo;
}

/**
 * Encodes a MedicalAlgorithm object into a URL-safe Base64 compressed string.
 */
export function encodeAlgorithmToUrl(algo: MedicalAlgorithm): string {
  try {
    const minified = minifyAlgorithm(algo);
    const jsonStr = JSON.stringify(minified);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (err) {
    console.error('Failed to serialize algorithm to URL', err);
    return '';
  }
}

/**
 * Decodes a compressed string from URL back into a MedicalAlgorithm object.
 */
export function decodeAlgorithmFromUrl(str: string): MedicalAlgorithm | null {
  if (!str) return null;
  
  try {
    try {
      // First try lz-string decompression (new format)
      const decompressed = LZString.decompressFromEncodedURIComponent(str);
      if (decompressed) {
        const parsed = JSON.parse(decompressed);
        // Check if it's new minified format (has '.i' instead of '.id' OR has '.n')
        if (parsed && (parsed.i || parsed.n || parsed.nd)) {
          return expandAlgorithm(parsed);
        }
        
        // Fallback: It was lz-string compressed, but was NOT minified (older link)
        const algo = parsed as MedicalAlgorithm;
        if (algo && algo.id && algo.name && Array.isArray(algo.nodes)) {
          if (!Array.isArray(algo.connections)) {
            algo.connections = [];
          }
          return algo;
        }
      }
    } catch(err) {
      // Ignore, likely not lz-string compressed, proceed to fallback
    }
    
    // Fallback: try old base64 decoding format if lz decompressed format fails
    const decodedUri = decodeURIComponent(str);
    const decodedStr = decodeURIComponent(
      atob(decodedUri)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const algo = JSON.parse(decodedStr) as MedicalAlgorithm;
    // Verify base properties
    if (algo && algo.id && algo.name && Array.isArray(algo.nodes)) {
      if (!Array.isArray(algo.connections)) {
        algo.connections = [];
      }
      return algo;
    }
    return null;
  } catch (err) {
    console.error('Failed to parse algorithm from URL:', err);
    return null;
  }
}

/**
 * Creates a sharing link for the algorithm using the current app URL or window.location.
 */
export function getShareQueryLink(algo: MedicalAlgorithm): string {
  const code = encodeAlgorithmToUrl(algo);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?algo_share=${code}`;
}

