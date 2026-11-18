import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_PRESETS,
  hasLayoutCollisions,
  interpolateComponentPosition,
  isComponentInsideBoard,
  validateBoardFileName,
} from './pcbLayout';

test('all board presets keep every component inside the board outline with margin', () => {
  for (const preset of Object.values(BOARD_PRESETS)) {
    for (const comp of preset.components) {
      assert.equal(
        isComponentInsideBoard(comp, preset.board, 6),
        true,
        `Component ${comp.designator} in preset ${preset.id} exceeds board bounds`
      );
    }
  }
});

test('all board presets have zero overlapping components in settled layout', () => {
  for (const preset of Object.values(BOARD_PRESETS)) {
    assert.equal(
      hasLayoutCollisions(preset, 4),
      false,
      `Preset ${preset.id} has overlapping components`
    );
  }
});

test('component interpolation moves from scattered offset at t=0 to ordered origin at t=1', () => {
  const comp = BOARD_PRESETS['sensor-node'].components[0];
  const start = interpolateComponentPosition(comp, 0);
  assert.equal(start.translateX, comp.scatterX);
  assert.equal(start.translateY, comp.scatterY);
  assert.equal(start.rotateDeg, comp.scatterRotateDeg);

  const settled = interpolateComponentPosition(comp, 1);
  assert.equal(settled.translateX, 0);
  assert.equal(settled.translateY, 0);
  assert.equal(settled.rotateDeg, 0);
});

test('validateBoardFileName accepts supported KiCad/netlist formats and rejects others', () => {
  assert.deepEqual(validateBoardFileName('board.kicad_pcb'), { valid: true });
  assert.deepEqual(validateBoardFileName('schematic.kicad_sch'), { valid: true });
  assert.deepEqual(validateBoardFileName('netlist.net'), { valid: true });
  assert.equal(validateBoardFileName('').valid, false);
  assert.equal(validateBoardFileName('photo.png').valid, false);
});
