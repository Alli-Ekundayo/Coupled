export interface PcbPinSide {
  side: 'left' | 'right' | 'top' | 'bottom';
  count: number;
}

export interface PcbComponentSpec {
  id: string;
  designator: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scatterX: number;
  scatterY: number;
  scatterRotateDeg: number;
  pins?: PcbPinSide[];
  innerInset?: number;
}

export interface PcbTraceSpec {
  id: string;
  points: Array<[number, number]>;
  viaPoints?: Array<[number, number]>;
  lengthEstimate: number;
}

export interface PcbBoardPreset {
  id: 'sensor-node' | 'usb-pd';
  name: string;
  fileName: string;
  board: {
    x: number;
    y: number;
    width: number;
    height: number;
    cornerRadius: number;
    mountingHoles: Array<[number, number]>;
    holeRadius: number;
  };
  components: PcbComponentSpec[];
  traces: PcbTraceSpec[];
  rulesSummary: {
    minClearanceMm: number;
    traceWidthMm: number;
    drcViolations: number;
  };
}

export const BOARD_PRESETS: Record<PcbBoardPreset['id'], PcbBoardPreset> = {
  'sensor-node': {
    id: 'sensor-node',
    name: 'STM32 Sensor Node',
    fileName: 'sensor-node-rev2.kicad_pcb',
    board: {
      x: 36,
      y: 32,
      width: 448,
      height: 336,
      cornerRadius: 6,
      mountingHoles: [
        [58, 54],
        [462, 54],
        [58, 346],
        [462, 346],
      ],
      holeRadius: 7,
    },
    components: [
      {
        id: 'j1',
        designator: 'J1',
        label: 'USB-C',
        x: 48,
        y: 148,
        width: 44,
        height: 104,
        scatterX: -22,
        scatterY: -44,
        scatterRotateDeg: -8,
        pins: [{ side: 'right', count: 5 }],
      },
      {
        id: 'u2',
        designator: 'U2',
        label: 'LDO',
        x: 132,
        y: 78,
        width: 56,
        height: 44,
        scatterX: -32,
        scatterY: 42,
        scatterRotateDeg: 11,
        pins: [
          { side: 'left', count: 2 },
          { side: 'right', count: 3 },
        ],
      },
      {
        id: 'c1',
        designator: 'C1',
        label: '100nF',
        x: 138,
        y: 154,
        width: 34,
        height: 20,
        scatterX: -18,
        scatterY: -56,
        scatterRotateDeg: -14,
      },
      {
        id: 'y1',
        designator: 'Y1',
        label: '16MHz',
        x: 134,
        y: 222,
        width: 42,
        height: 30,
        scatterX: -28,
        scatterY: 36,
        scatterRotateDeg: 14,
        pins: [
          { side: 'right', count: 2 },
        ],
      },
      {
        id: 'u1',
        designator: 'U1',
        label: 'MCU',
        x: 224,
        y: 136,
        width: 116,
        height: 116,
        scatterX: 26,
        scatterY: -42,
        scatterRotateDeg: -6,
        innerInset: 14,
        pins: [
          { side: 'left', count: 6 },
          { side: 'right', count: 6 },
          { side: 'top', count: 6 },
          { side: 'bottom', count: 6 },
        ],
      },
      {
        id: 'c2',
        designator: 'C2',
        label: '10uF',
        x: 262,
        y: 66,
        width: 40,
        height: 22,
        scatterX: 46,
        scatterY: -24,
        scatterRotateDeg: 10,
      },
      {
        id: 'd1',
        designator: 'D1',
        label: 'TVS',
        x: 256,
        y: 298,
        width: 52,
        height: 26,
        scatterX: -38,
        scatterY: 28,
        scatterRotateDeg: -9,
      },
      {
        id: 'r1',
        designator: 'R1',
        label: '4k7',
        x: 386,
        y: 84,
        width: 28,
        height: 52,
        scatterX: 34,
        scatterY: 46,
        scatterRotateDeg: -11,
      },
      {
        id: 'j2',
        designator: 'J2',
        label: 'HDR',
        x: 408,
        y: 176,
        width: 48,
        height: 124,
        scatterX: 22,
        scatterY: -48,
        scatterRotateDeg: 7,
        pins: [{ side: 'left', count: 6 }],
      },
    ],
    traces: [
      // J1 -> U2 power rail
      {
        id: 't1',
        points: [
          [92, 166],
          [110, 166],
          [110, 94],
          [132, 94],
        ],
        lengthEstimate: 132,
      },
      // J1 -> C1 -> U1 data lines
      {
        id: 't2',
        points: [
          [92, 184],
          [120, 184],
          [134, 198],
          [224, 198],
        ],
        lengthEstimate: 146,
      },
      {
        id: 't3',
        points: [
          [92, 200],
          [114, 200],
          [128, 214],
          [224, 214],
        ],
        lengthEstimate: 148,
      },
      // U2 -> C2 -> U1 3V3
      {
        id: 't4',
        points: [
          [188, 92],
          [242, 92],
          [242, 77],
          [262, 77],
        ],
        lengthEstimate: 100,
      },
      {
        id: 't5',
        points: [
          [282, 88],
          [282, 136],
        ],
        lengthEstimate: 48,
      },
      // C1 -> U1
      {
        id: 't6',
        points: [
          [172, 164],
          [224, 164],
        ],
        lengthEstimate: 52,
      },
      // Y1 -> U1 clock pair
      {
        id: 't7',
        points: [
          [176, 232],
          [224, 232],
        ],
        lengthEstimate: 48,
      },
      {
        id: 't8',
        points: [
          [176, 242],
          [224, 242],
        ],
        lengthEstimate: 48,
      },
      // U1 -> R1 -> J2 I2C / SPI bus
      {
        id: 't9',
        points: [
          [340, 160],
          [364, 160],
          [364, 110],
          [386, 110],
        ],
        viaPoints: [[364, 160]],
        lengthEstimate: 96,
      },
      {
        id: 't10',
        points: [
          [340, 190],
          [408, 190],
        ],
        lengthEstimate: 68,
      },
      {
        id: 't11',
        points: [
          [340, 208],
          [408, 208],
        ],
        lengthEstimate: 68,
      },
      {
        id: 't12',
        points: [
          [340, 226],
          [408, 226],
        ],
        lengthEstimate: 68,
      },
      // U1 -> D1 protection & J2 ground return
      {
        id: 't13',
        points: [
          [272, 252],
          [272, 298],
        ],
        lengthEstimate: 46,
      },
      {
        id: 't14',
        points: [
          [308, 311],
          [372, 311],
          [390, 293],
          [390, 266],
          [408, 266],
        ],
        viaPoints: [[372, 311]],
        lengthEstimate: 140,
      },
      // R1 -> J2
      {
        id: 't15',
        points: [
          [414, 110],
          [432, 110],
          [432, 176],
        ],
        lengthEstimate: 84,
      },
    ],
    rulesSummary: {
      minClearanceMm: 0.15,
      traceWidthMm: 0.2,
      drcViolations: 0,
    },
  },
  'usb-pd': {
    id: 'usb-pd',
    name: 'USB-C PD Controller',
    fileName: 'usbc-pd-100w.kicad_pcb',
    board: {
      x: 36,
      y: 32,
      width: 448,
      height: 336,
      cornerRadius: 6,
      mountingHoles: [
        [58, 54],
        [462, 54],
        [58, 346],
        [462, 346],
      ],
      holeRadius: 7,
    },
    components: [
      {
        id: 'j1',
        designator: 'J1',
        label: 'PD-IN',
        x: 48,
        y: 138,
        width: 46,
        height: 124,
        scatterX: -24,
        scatterY: 38,
        scatterRotateDeg: 8,
        pins: [{ side: 'right', count: 6 }],
      },
      {
        id: 'q1',
        designator: 'Q1',
        label: 'FET-H',
        x: 138,
        y: 84,
        width: 58,
        height: 46,
        scatterX: 28,
        scatterY: -44,
        scatterRotateDeg: -12,
        pins: [
          { side: 'left', count: 2 },
          { side: 'right', count: 2 },
        ],
      },
      {
        id: 'u1',
        designator: 'U1',
        label: 'PD-IC',
        x: 214,
        y: 152,
        width: 96,
        height: 96,
        scatterX: -30,
        scatterY: -36,
        scatterRotateDeg: 7,
        innerInset: 12,
        pins: [
          { side: 'left', count: 5 },
          { side: 'right', count: 5 },
          { side: 'top', count: 5 },
          { side: 'bottom', count: 5 },
        ],
      },
      {
        id: 'l1',
        designator: 'L1',
        label: '10uH',
        x: 356,
        y: 78,
        width: 68,
        height: 56,
        scatterX: 36,
        scatterY: 42,
        scatterRotateDeg: -10,
      },
      {
        id: 'c1',
        designator: 'C1',
        label: '22uF',
        x: 146,
        y: 266,
        width: 44,
        height: 24,
        scatterX: -24,
        scatterY: 48,
        scatterRotateDeg: 13,
      },
      {
        id: 'c2',
        designator: 'C2',
        label: '22uF',
        x: 348,
        y: 256,
        width: 44,
        height: 24,
        scatterX: 30,
        scatterY: -44,
        scatterRotateDeg: -11,
      },
      {
        id: 'j2',
        designator: 'J2',
        label: 'VOUT',
        x: 416,
        y: 162,
        width: 40,
        height: 88,
        scatterX: 22,
        scatterY: 46,
        scatterRotateDeg: 9,
        pins: [{ side: 'left', count: 4 }],
      },
    ],
    traces: [
      {
        id: 'p1',
        points: [
          [94, 156],
          [116, 156],
          [116, 106],
          [138, 106],
        ],
        lengthEstimate: 116,
      },
      {
        id: 'p2',
        points: [
          [196, 106],
          [356, 106],
        ],
        lengthEstimate: 160,
      },
      {
        id: 'p3',
        points: [
          [94, 198],
          [214, 198],
        ],
        lengthEstimate: 120,
      },
      {
        id: 'p4',
        points: [
          [94, 214],
          [214, 214],
        ],
        lengthEstimate: 120,
      },
      {
        id: 'p5',
        points: [
          [196, 116],
          [262, 116],
          [262, 152],
        ],
        lengthEstimate: 102,
      },
      {
        id: 'p6',
        points: [
          [310, 190],
          [416, 190],
        ],
        lengthEstimate: 106,
      },
      {
        id: 'p7',
        points: [
          [390, 134],
          [390, 174],
          [416, 174],
        ],
        viaPoints: [[390, 174]],
        lengthEstimate: 66,
      },
      {
        id: 'p8',
        points: [
          [168, 266],
          [168, 228],
          [214, 228],
        ],
        lengthEstimate: 84,
      },
      {
        id: 'p9',
        points: [
          [310, 218],
          [370, 218],
          [370, 256],
        ],
        lengthEstimate: 98,
      },
    ],
    rulesSummary: {
      minClearanceMm: 0.2,
      traceWidthMm: 0.35,
      drcViolations: 0,
    },
  },
};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectsOverlap(a: Rect, b: Rect, minGap = 0): boolean {
  return !(
    a.x + a.width + minGap <= b.x ||
    b.x + b.width + minGap <= a.x ||
    a.y + a.height + minGap <= b.y ||
    b.y + b.height + minGap <= a.y
  );
}

export function isComponentInsideBoard(
  comp: PcbComponentSpec,
  board: PcbBoardPreset['board'],
  margin = 6
): boolean {
  return (
    comp.x >= board.x + margin &&
    comp.y >= board.y + margin &&
    comp.x + comp.width <= board.x + board.width - margin &&
    comp.y + comp.height <= board.y + board.height - margin
  );
}

export function hasLayoutCollisions(preset: PcbBoardPreset, minGap = 4): boolean {
  for (let i = 0; i < preset.components.length; i += 1) {
    for (let j = i + 1; j < preset.components.length; j += 1) {
      if (rectsOverlap(preset.components[i], preset.components[j], minGap)) {
        return true;
      }
    }
  }
  return false;
}

export function interpolateComponentPosition(
  comp: PcbComponentSpec,
  progress: number
): { translateX: number; translateY: number; rotateDeg: number } {
  const clamped = Math.max(0, Math.min(1, progress));
  const remaining = 1 - clamped;
  return {
    translateX: comp.scatterX * remaining || 0,
    translateY: comp.scatterY * remaining || 0,
    rotateDeg: comp.scatterRotateDeg * remaining || 0,
  };
}

const SUPPORTED_EXTENSIONS = ['.kicad_pcb', '.kicad_sch', '.net', '.json'];

export function validateBoardFileName(fileName: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please select a board or schematic file.' };
  }
  const lower = trimmed.toLowerCase();
  const matches = SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!matches) {
    return {
      valid: false,
      error: 'Unsupported format. Use .kicad_pcb, .kicad_sch, .net, or .json.',
    };
  }
  return { valid: true };
}
