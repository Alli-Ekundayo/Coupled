/**
 * Stand-in 3D packages for the footprints placed in the KiCad VRML export.
 *
 * The VRML only *references* its component models (`Inline shapes3D/*.wrl`), so those
 * files are not part of the upload. Each footprint below is rebuilt from box primitives
 * using the package dimensions (millimetres) so every placement in the file is still
 * rendered, in the right place and orientation.
 *
 * Frame: model origin on the board surface, +z up, same x/y axes as the KiCad model
 * (through-hole parts have their origin on pin 1, SMD parts are centred).
 */

export type PartMaterial =
  | 'silver'
  | 'gold'
  | 'ceramic'
  | 'resistor'
  | 'tantalum'
  | 'ic'
  | 'plastic'
  | 'metal'
  | 'trimmer'
  | 'terminal';

export type ComponentKind = 'passive' | 'ic' | 'connector';

export interface FootprintPart {
  material: PartMaterial;
  /** Box size [x, y, z] */
  size: [number, number, number];
  /** Box centre [x, y, z] relative to the model origin */
  at: [number, number, number];
  /** Optional grid of copies: nx*ny boxes spaced dx/dy apart, starting at `at` */
  repeat?: { nx: number; ny: number; dx: number; dy: number };
}

export interface FootprintSpec {
  kind: ComponentKind;
  parts: FootprintPart[];
}

function chip(
  length: number,
  width: number,
  height: number,
  body: PartMaterial
): FootprintPart[] {
  const cap = 0.4;
  return [
    { material: body, size: [length - cap * 2, width, height * 0.9], at: [0, 0, height * 0.45] },
    { material: 'silver', size: [cap, width, height], at: [-(length / 2 - cap / 2), 0, height / 2] },
    { material: 'silver', size: [cap, width, height], at: [length / 2 - cap / 2, 0, height / 2] },
  ];
}

function soic(bodyLength: number): FootprintSpec {
  return {
    kind: 'ic',
    parts: [
      { material: 'ic', size: [3.9, bodyLength, 1.5], at: [0, 0, 0.1 + 0.75] },
      { material: 'silver', size: [1.2, bodyLength - 0.9, 0.2], at: [-2.45, 0, 0.2] },
      { material: 'silver', size: [1.2, bodyLength - 0.9, 0.2], at: [2.45, 0, 0.2] },
    ],
  };
}

/** Through-hole DIP: origin on pin 1, rows run toward -y, second row at +rowSpacing in x. */
function dip(pins: number, rowSpacing: number): FootprintSpec {
  const perRow = pins / 2;
  const span = perRow * 2.54;
  const bodyWidth = rowSpacing - 1.27;
  const centreY = -((perRow - 1) * 2.54) / 2;
  return {
    kind: 'ic',
    parts: [
      { material: 'ic', size: [bodyWidth, span - 0.4, 3.3], at: [rowSpacing / 2, centreY, 0.5 + 1.65] },
      { material: 'silver', size: [0.7, span - 1, 0.3], at: [0.5, centreY, 0.8] },
      { material: 'silver', size: [0.7, span - 1, 0.3], at: [rowSpacing - 0.5, centreY, 0.8] },
    ],
  };
}

/** Straight header/socket: origin on pin 1, columns toward +x, rows toward -y. */
function header(
  columns: number,
  rows: number,
  options: { plasticHeight: number; pinHeight: number; plastic?: PartMaterial }
): FootprintSpec {
  const { plasticHeight, pinHeight, plastic = 'plastic' } = options;
  const width = columns * 2.54;
  const length = rows * 2.54;
  const parts: FootprintPart[] = [
    {
      material: plastic,
      size: [width, length, plasticHeight],
      at: [(columns - 1) * 1.27, -((rows - 1) * 1.27), plasticHeight / 2],
    },
  ];
  if (pinHeight > 0) {
    parts.push({
      material: 'gold',
      size: [0.64, 0.64, pinHeight],
      at: [0, 0, pinHeight / 2],
      repeat: { nx: columns, ny: rows, dx: 2.54, dy: -2.54 },
    });
  }
  return { kind: 'connector', parts };
}

export const FOOTPRINTS: Record<string, FootprintSpec> = {
  R_0805: { kind: 'passive', parts: chip(2.0, 1.25, 0.5, 'resistor') },
  C_0603: { kind: 'passive', parts: chip(1.6, 0.8, 0.8, 'ceramic') },
  C_0805: { kind: 'passive', parts: chip(2.0, 1.25, 1.25, 'ceramic') },
  'TantalC_SizeB_EIA-3528_Reflow': {
    kind: 'passive',
    parts: [
      { material: 'tantalum', size: [3.0, 2.8, 1.9], at: [0, 0, 0.95] },
      { material: 'silver', size: [0.6, 2.2, 1.4], at: [-1.65, 0, 0.7] },
      { material: 'silver', size: [0.6, 2.2, 1.4], at: [1.65, 0, 0.7] },
      { material: 'resistor', size: [0.35, 2.82, 1.92], at: [1.05, 0, 0.95] },
    ],
  },
  R_Array_Concave_4x0603: {
    kind: 'passive',
    parts: [
      { material: 'resistor', size: [1.0, 3.2, 0.5], at: [0, 0, 0.3] },
      { material: 'silver', size: [0.4, 3.2, 0.4], at: [-0.7, 0, 0.2] },
      { material: 'silver', size: [0.4, 3.2, 0.4], at: [0.7, 0, 0.2] },
    ],
  },
  'SOT-23': {
    kind: 'ic',
    parts: [
      { material: 'ic', size: [2.9, 1.3, 1.0], at: [0, 0, 0.6] },
      { material: 'silver', size: [0.4, 1.0, 0.15], at: [-0.95, -1.0, 0.15] },
      { material: 'silver', size: [0.4, 1.0, 0.15], at: [0.95, -1.0, 0.15] },
      { material: 'silver', size: [0.4, 1.0, 0.15], at: [0, 1.0, 0.15] },
    ],
  },
  'SOT-23-5': {
    kind: 'ic',
    parts: [
      { material: 'ic', size: [2.9, 1.6, 1.1], at: [0, 0, 0.65] },
      {
        material: 'silver',
        size: [0.4, 1.0, 0.15],
        at: [-0.95, -1.2, 0.15],
        repeat: { nx: 3, ny: 1, dx: 0.95, dy: 0 },
      },
      {
        material: 'silver',
        size: [0.4, 1.0, 0.15],
        at: [-0.95, 1.2, 0.15],
        repeat: { nx: 2, ny: 1, dx: 1.9, dy: 0 },
      },
    ],
  },
  'SOT-223': {
    kind: 'ic',
    parts: [
      { material: 'ic', size: [3.6, 6.5, 1.6], at: [0, 0, 0.1 + 0.8] },
      { material: 'silver', size: [2.2, 3.0, 0.3], at: [2.6, 0, 0.3] },
      {
        material: 'silver',
        size: [1.6, 0.9, 0.25],
        at: [-2.6, -2.3, 0.2],
        repeat: { nx: 1, ny: 3, dx: 0, dy: 2.3 },
      },
    ],
  },
  'SOIC-8_3.9x4.9mm_Pitch1.27mm': soic(4.9),
  'SOIC-14_3.9x8.7mm_Pitch1.27mm': soic(8.7),
  'SOIC-16_3.9x9.9mm_Pitch1.27mm': soic(9.9),
  'DIP-8_W7.62mm': dip(8, 7.62),
  'DIP-16_W7.62mm': dip(16, 7.62),
  'DIP-24_W15.24mm': dip(24, 15.24),
  'DIP-40_W15.24mm': dip(40, 15.24),
  'Oscillator_DIP-8': {
    kind: 'ic',
    parts: [{ material: 'metal', size: [13.2, 13.2, 5.8], at: [3.81, -3.81, 0.3 + 2.9] }],
  },
  Socket_Strip_Straight_2x12: header(2, 12, { plasticHeight: 8.5, pinHeight: 0 }),
  'Pin_Header_Angled_2x12_Pitch2.54mm': header(2, 12, { plasticHeight: 2.5, pinHeight: 11 }),
  'Pin_Header_Straight_1x10': header(1, 10, { plasticHeight: 2.5, pinHeight: 11.5 }),
  'Pin_Header_Straight_1x03': header(1, 3, { plasticHeight: 2.5, pinHeight: 11.5 }),
  'Pin_Header_Straight_1x02': header(1, 2, { plasticHeight: 2.5, pinHeight: 11.5 }),
  'Potentiometer_Bourns_3296W_3-8Zoll_Inline_ScrewUp': {
    kind: 'connector',
    parts: [
      { material: 'trimmer', size: [9.5, 4.8, 10], at: [2.54, 0, 5] },
      { material: 'gold', size: [2.6, 2.6, 0.6], at: [2.54, 0, 10.3] },
    ],
  },
  '405.24-7': {
    kind: 'connector',
    parts: [{ material: 'terminal', size: [12, 8, 8], at: [0, 0, 4] }],
  },
};

/** Fallback so an unknown footprint still shows up as a block rather than vanishing. */
export const FALLBACK_FOOTPRINT: FootprintSpec = {
  kind: 'passive',
  parts: [{ material: 'plastic', size: [2, 2, 1], at: [0, 0, 0.5] }],
};
