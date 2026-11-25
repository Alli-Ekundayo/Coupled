import { BUILD_MODES, BuildModeId, describeRun } from './buildModes';
import { BOARD_PRESETS, PcbBoardPreset } from './pcbLayout';

export interface StartRequest {
  mode: BuildModeId;
  presetId: PcbBoardPreset['id'];
  fileName?: string;
  file?: File;
  brief?: string;
}

export interface Project {
  id: string;
  mode: BuildModeId;
  presetId: PcbBoardPreset['id'];
  name: string;
  summary: string;
}

const MAX_BRIEF_NAME_LENGTH = 38;

export function formatProjectName(request: StartRequest): string {
  if (request.mode === 'scratch') {
    const brief = (request.brief ?? '').trim().replace(/\s+/g, ' ');
    if (!brief) return 'AI draft';
    return brief.length > MAX_BRIEF_NAME_LENGTH
      ? `${brief.slice(0, 37)}…`
      : brief;
  }
  return request.fileName ?? BOARD_PRESETS[request.presetId].fileName;
}

export function createProject(request: StartRequest, index: number): Project {
  const preset = BOARD_PRESETS[request.presetId];
  return {
    id: `project-${index}`,
    mode: request.mode,
    presetId: request.presetId,
    name: formatProjectName(request),
    summary: describeRun(BUILD_MODES[request.mode], preset, request.fileName),
  };
}
