/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  deleted?: boolean;
}

export type VideoResolution = '1080p' | '720p' | '480p' | 'Auto';
export type VideoOrientation = 'landscape' | 'portrait';
