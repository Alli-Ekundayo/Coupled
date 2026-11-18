import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDesktopPcbPose } from './pcbScrollPose';

const MOCK_LAYOUT = {
  viewportHeight: 900,
  howItWorksTop: 920,
  howItWorksHeight: 680,
  pricingTop: 1620,
};

test('desktop PCB starts in right hero column with zero explode at scrollY=0', () => {
  const pose = computeDesktopPcbPose({
    scrollY: 0,
    ...MOCK_LAYOUT,
  });

  assert.ok(pose.x > 1.5, 'Hero pose should sit in right column (+X)');
  assert.ok(pose.scale < 1.0, 'Hero pose should stay contained inside column');
  assert.equal(pose.explode, 0);
  assert.equal(pose.opacity, 1);
});

test('desktop PCB glides to left How It Works lane and explodes layers mid-scroll', () => {
  const pose = computeDesktopPcbPose({
    scrollY: 850,
    ...MOCK_LAYOUT,
  });

  assert.ok(pose.x < -1.5, 'How It Works pose should sit in left stage column (-X)');
  assert.ok(pose.scale < 0.7, 'How It Works pose should fit cleanly inside inspection frame');
  assert.ok(pose.explode > 0.5, 'How It Works pose should show exploded 3D layer separation');
  assert.equal(pose.opacity, 1);
});

test('desktop PCB re-assembles and clears out of pricing cards at deep scroll', () => {
  const pose = computeDesktopPcbPose({
    scrollY: 1650,
    ...MOCK_LAYOUT,
  });

  assert.ok(pose.y > 2.0, 'Pricing scroll pose should glide upward out of card text');
  assert.equal(pose.explode, 0);
  assert.equal(pose.opacity, 0);
});
