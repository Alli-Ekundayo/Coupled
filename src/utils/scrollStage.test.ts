import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScrollValues, computeStageProgress } from './scrollStage';

test('progress is 0 before the section pins and 1 when it releases', () => {
  assert.equal(computeStageProgress(300, 3600, 900), 0);
  assert.equal(computeStageProgress(0, 3600, 900), 0);
  assert.equal(computeStageProgress(-1350, 3600, 900), 0.5);
  assert.equal(computeStageProgress(-2700, 3600, 900), 1);
  assert.equal(computeStageProgress(-5000, 3600, 900), 1);
});

test('progress is 0 when the section is not taller than the viewport', () => {
  assert.equal(computeStageProgress(-100, 800, 900), 0);
});

test('all three values start at rest', () => {
  assert.deepEqual(computeScrollValues(0), { slide: 0, explode: 0, zoom: 0 });
});

test('all three values are fully applied at the end', () => {
  assert.deepEqual(computeScrollValues(1), { slide: 1, explode: 1, zoom: 1 });
});

test('values stay within 0..1 for out-of-range progress', () => {
  for (const p of [-1, 2]) {
    const v = computeScrollValues(p);
    for (const value of Object.values(v)) {
      assert.ok(value >= 0 && value <= 1);
    }
  }
});

test('slide leads, then explode, then zoom', () => {
  const early = computeScrollValues(0.2);
  assert.ok(early.slide > 0.5);
  assert.equal(early.zoom, 0);
  assert.equal(early.explode, 0);

  const mid = computeScrollValues(0.5);
  assert.equal(mid.slide, 1);
  assert.ok(mid.explode > 0.5);
  assert.ok(mid.zoom < 0.1);

  const late = computeScrollValues(0.8);
  assert.equal(late.explode, 1);
  assert.ok(late.zoom > 0.5);
});

test('each value is monotonic with scroll progress', () => {
  let prev = computeScrollValues(0);
  for (let i = 1; i <= 100; i += 1) {
    const next = computeScrollValues(i / 100);
    assert.ok(next.slide >= prev.slide);
    assert.ok(next.explode >= prev.explode);
    assert.ok(next.zoom >= prev.zoom);
    prev = next;
  }
});
