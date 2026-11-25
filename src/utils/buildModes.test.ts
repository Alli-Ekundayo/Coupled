import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD_MODES, describeRun, validateModeInput } from './buildModes';
import { BOARD_PRESETS } from './pcbLayout';

test('scratch mode needs a brief, not a file', () => {
  assert.ok(validateModeInput(BUILD_MODES.scratch, { fileName: '', brief: 'too short' }));
  assert.equal(
    validateModeInput(BUILD_MODES.scratch, { fileName: '', brief: 'A USB-C powered LED strip driver' }),
    null
  );
});

test('route-only requires an already placed board, not a schematic', () => {
  assert.equal(
    validateModeInput(BUILD_MODES['route-only'], { fileName: 'a.kicad_pcb', brief: '' }),
    null
  );
  assert.ok(
    validateModeInput(BUILD_MODES['route-only'], { fileName: 'a.kicad_sch', brief: '' })
  );
});

test('place & route accepts schematics and netlists; empty file falls back to reference board', () => {
  assert.equal(validateModeInput(BUILD_MODES.full, { fileName: 'a.net', brief: '' }), null);
  assert.equal(validateModeInput(BUILD_MODES.full, { fileName: '', brief: '' }), null);
  assert.ok(validateModeInput(BUILD_MODES.full, { fileName: 'photo.png', brief: '' }));
});

test('describeRun names the mode and rule summary', () => {
  const preset = BOARD_PRESETS['sensor-node'];
  const line = describeRun(BUILD_MODES['route-only'], preset, 'mine.kicad_pcb');
  assert.match(line, /^mine\.kicad_pcb · Route only · /);
  assert.match(describeRun(BUILD_MODES.scratch, preset), /^AI draft · Start from scratch/);
});
