/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { MedicalAlgorithm } from '../types.ts';

/**
 * Encodes a MedicalAlgorithm object into a URL-safe Base64 compressed string.
 */
export function encodeAlgorithmToUrl(algo: MedicalAlgorithm): string {
  try {
    const jsonStr = JSON.stringify(algo);
    return compressToEncodedURIComponent(jsonStr);
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
    // First try lz-string decompression (new format)
    const decompressed = decompressFromEncodedURIComponent(str);
    if (decompressed) {
      const algo = JSON.parse(decompressed) as MedicalAlgorithm;
      if (algo && algo.id && algo.name && Array.isArray(algo.nodes)) {
        return algo;
      }
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
