import { PcbBoardPreset } from './pcbLayout';

export type BuildModeId = 'full' | 'scratch' | 'route-only';

export interface BuildMode {
  id: BuildModeId;
  number: string;
  /** Short label used in pickers and banners. */
  label: string;
  title: string;
  description: string;
  /** One-line "what you bring" hint. */
  input: string;
  /** Extensions accepted for this mode; `null` when no board file is needed. */
  accepts: readonly string[] | null;
  cta: string;
}

export const BUILD_MODES: Record<BuildModeId, BuildMode> = {
  full: {
    id: 'full',
    number: '01',
    label: 'Place & route',
    title: 'Place and route an existing design',
    description:
      'Bring a finished KiCad design. Coupled auto-places every footprint, then routes the copper between them.',
    input: 'You bring: .kicad_pcb, .kicad_sch or .net',
    accepts: ['.kicad_pcb', '.kicad_sch', '.net', '.json'],
    cta: 'Place & route my board',
  },
  scratch: {
    id: 'scratch',
    number: '02',
    label: 'Start from scratch',
    title: 'Start from scratch with AI',
    description:
      'No schematic yet? Describe what you want to build and let the AI help you get from idea to a first board.',
    input: 'You bring: a plain-language brief',
    accepts: null,
    cta: 'Draft my board',
  },
  'route-only': {
    id: 'route-only',
    number: '03',
    label: 'Route only',
    title: 'Route a board you already placed',
    description:
      'Happy with your placement? Keep every footprint exactly where it is and let Coupled handle the routing.',
    input: 'You bring: a placed .kicad_pcb',
    accepts: ['.kicad_pcb', '.json'],
    cta: 'Route my board',
  },
};

export const BUILD_MODE_LIST: BuildMode[] = [
  BUILD_MODES.full,
  BUILD_MODES.scratch,
  BUILD_MODES['route-only'],
];

export const MIN_BRIEF_LENGTH = 10;

export const BRIEF_EXAMPLES = [
  'A Wi-Fi temperature logger with a USB-C port and a coin cell',
  'A 4-channel motor driver board for a small robot',
  'A pocket MIDI controller with 8 buttons',
] as const;

/** Validates the user's input for a mode; returns an error message or `null`. */
export function validateModeInput(
  mode: BuildMode,
  input: { fileName: string; brief: string }
): string | null {
  if (mode.accepts === null) {
    return input.brief.trim().length < MIN_BRIEF_LENGTH
      ? 'Describe your project in a sentence or two.'
      : null;
  }
  const name = input.fileName.trim();
  if (!name) return null; // no file: the reference board is used instead
  const lower = name.toLowerCase();
  if (mode.accepts.some((ext) => lower.endsWith(ext))) return null;
  return `Unsupported format for "${mode.label}". Use ${mode.accepts.join(', ')}.`;
}

/** Status line shown in the hero after a run is started. */
export function describeRun(
  mode: BuildMode,
  preset: PcbBoardPreset,
  sourceName?: string
): string {
  const rules = `${preset.rulesSummary.drcViolations} DRC violations · ${preset.rulesSummary.minClearanceMm}mm clearance`;
  const source =
    mode.id === 'scratch' ? 'AI draft' : (sourceName ?? preset.fileName);
  return `${source} · ${mode.label} · ${rules}`;
}
