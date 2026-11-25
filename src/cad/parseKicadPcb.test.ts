import test from 'node:test';
import assert from 'node:assert/strict';
import { rotatePt, hitTestFootprint } from './math';
import { parseKicadPcb } from './parseKicadPcb';
import { createLocalSampleProject } from './sampleProject';

test('rotatePt rotates footprint offsets CCW in KiCad Y-down coordinate frame', () => {
  const [rx, ry] = rotatePt(1, 0, 90);
  assert.ok(Math.abs(rx - 0) < 1e-6);
  assert.ok(Math.abs(ry - -1) < 1e-6);
});

test('parseKicadPcb extracts nets, footprints, pads, segments, vias, and Edge.Cuts', () => {
  const sample = createLocalSampleProject();
  const parsed = parseKicadPcb(sample.kicadPcbText);

  assert.equal(parsed.netNames[1], 'VBUS');
  assert.equal(parsed.netNames[3], '3V3');
  assert.equal(parsed.footprints.length, 10);
  assert.ok(parsed.segments.length >= 15);
  assert.equal(parsed.vias.length, 4);
  assert.equal(parsed.bounds.width, 42);
  assert.equal(parsed.bounds.height, 30);

  const u1 = parsed.footprints.find((f) => f.ref === 'U1');
  assert.ok(u1);
  assert.equal(u1.value, 'AP2112K-3.3TRG1');
  assert.equal(u1.pads.length, 5);
  assert.equal(hitTestFootprint(u1, u1.x, u1.y), true);
  assert.equal(hitTestFootprint(u1, 0, 0), false);
});

test('parseKicadPcb chains Edge.Cuts gr_line segments and preserves cutout holes and zones', () => {
  const pcbWithCutout = `(kicad_pcb
    (net 0 "")
    (net 1 "GND")
    (gr_line (start 0 0) (end 50 0) (layer "Edge.Cuts"))
    (gr_line (start 50 0) (end 50 40) (layer "Edge.Cuts"))
    (gr_line (start 50 40) (end 0 40) (layer "Edge.Cuts"))
    (gr_line (start 0 40) (end 0 0) (layer "Edge.Cuts"))
    (gr_rect (start 20 15) (end 30 25) (layer "Edge.Cuts"))
    (zone (net_name "GND") (layer "B.Cu")
      (polygon (pts (xy 1 1) (xy 49 1) (xy 49 39) (xy 1 39)))
    )
    (footprint "Resistor_SMD:R_0603"
      (at 10 10 90)
      (fp_text reference "R1" (at 0 0))
      (pad "1" smd roundrect (at -0.8 0) (size 0.9 0.9) (net 1 "GND"))
    )
  )`;

  const parsed = parseKicadPcb(pcbWithCutout);
  assert.equal(parsed.outerPolygon.length, 4);
  assert.equal(parsed.cutouts.length, 1);
  assert.equal(parsed.zones.length, 1);
  assert.equal(parsed.zones[0].netName, 'GND');
  assert.equal(parsed.footprints[0].ref, 'R1');
  // Pad omitted angle should default to footprint rotation (90)
  assert.equal(parsed.footprints[0].pads[0].ang, 90);
});
