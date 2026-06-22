/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalAlgorithm } from '../types.ts';

/**
 * Encodes a MedicalAlgorithm object into a URL-safe Base64 compressed string.
 */
export function encodeAlgorithmToUrl(algo: MedicalAlgorithm): string {
  try {
    const jsonStr = JSON.stringify(algo);
    // Convert to UTF-8 then base64 to handle non-ASCII characters
    const encoded = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return encodeURIComponent(encoded);
  } catch (err) {
    console.error('Failed to serialize algorithm to URL', err);
    return '';
  }
}

/**
 * Decodes a Base64 string from URL back into a MedicalAlgorithm object.
 */
export function decodeAlgorithmFromUrl(str: string): MedicalAlgorithm | null {
  if (!str) return null;
  try {
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
