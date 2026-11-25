import { useCallback, useEffect, useRef } from 'react';
import { hitTestFootprint, rotatePt, screenToWorld, worldToScreen } from './math';
import { ParsedKicadPcb } from './parseKicadPcb';
import { useStudioStore } from '../store/useStudioStore';

interface PcbCanvas2DProps {
  board: ParsedKicadPcb | null;
  fitTrigger: number;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function PcbCanvas2D({ board, fitTrigger }: PcbCanvas2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const layers = useStudioStore((s) => s.layers);
  const selectedRef = useStudioStore((s) => s.selectedRef);
  const highlightedNet = useStudioStore((s) => s.highlightedNet);
  const camera2d = useStudioStore((s) => s.camera2d);
  const setCamera2d = useStudioStore((s) => s.setCamera2d);
  const selectComponent = useStudioStore((s) => s.selectComponent);
  const setHighlightedNet = useStudioStore((s) => s.setHighlightedNet);
  const setCursorMm = useStudioStore((s) => s.setCursorMm);

  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startCx: number;
    startCy: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startCx: 0,
    startCy: 0,
  });

  const fitToBoard = useCallback(() => {
    const container = containerRef.current;
    if (!board || !container) return;
    const vw = Math.max(container.clientWidth, 100);
    const vh = Math.max(container.clientHeight, 100);
    const padPx = 90;
    const scaleX = (vw - padPx) / Math.max(board.bounds.width, 1);
    const scaleY = (vh - padPx) / Math.max(board.bounds.height, 1);
    const scale = Math.max(3, Math.min(60, Math.min(scaleX, scaleY)));
    setCamera2d({
      cx: board.bounds.minX + board.bounds.width / 2,
      cy: board.bounds.minY + board.bounds.height / 2,
      scale,
    });
  }, [board, setCamera2d]);

  useEffect(() => {
    fitToBoard();
  }, [fitToBoard, fitTrigger]);

  // Draw 2D PCB layers back-to-front on DPR-scaled canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const vw = Math.max(container.clientWidth, 1);
    const vh = Math.max(container.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    if (!board) return;

    const cam = camera2d;
    const toScreen = (wx: number, wy: number) => worldToScreen(wx, wy, cam, vw, vh);
    const hasNetHighlight = Boolean(highlightedNet);

    // 1. Substrate polygon (#081b15) + cutout holes (#111214) + Edge.Cuts (#e8c85a)
    if (board.outerPolygon.length >= 3) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;

      ctx.beginPath();
      board.outerPolygon.forEach(([x, y], idx) => {
        const [sx, sy] = toScreen(x, y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();

      for (const hole of board.cutouts) {
        if (hole.length < 3) continue;
        hole.forEach(([x, y], idx) => {
          const [sx, sy] = toScreen(x, y);
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
      }

      ctx.fillStyle = '#081b15';
      ctx.fill('evenodd');
      ctx.restore();

      // Crisp Edge.Cuts border
      ctx.save();
      ctx.strokeStyle = '#e8c85a';
      ctx.lineWidth = Math.max(1.25, 0.16 * cam.scale);
      ctx.lineJoin = 'round';

      const strokePoly = (pts: Array<[number, number]>) => {
        if (pts.length < 2) return;
        ctx.beginPath();
        pts.forEach(([x, y], idx) => {
          const [sx, sy] = toScreen(x, y);
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.stroke();
      };

      strokePoly(board.outerPolygon);
      for (const hole of board.cutouts) strokePoly(hole);
      ctx.restore();
    }

    // 2. Copper pour zone outlines
    if (layers.zones && board.zones.length > 0) {
      ctx.save();
      for (const z of board.zones) {
        if (z.polygon.length < 3) continue;
        const isBack = z.layer.includes('B.');
        ctx.beginPath();
        z.polygon.forEach(([x, y], idx) => {
          const [sx, sy] = toScreen(x, y);
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = isBack ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 68, 68, 0.08)';
        ctx.fill();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isBack ? 'rgba(59, 130, 246, 0.35)' : 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    const drawSegments = (layerFilter: 'B.Cu' | 'F.Cu', baseColor: string) => {
      ctx.save();
      ctx.lineCap = 'round';
      for (const seg of board.segments) {
        if (seg.layer !== layerFilter) continue;
        const isMatched = hasNetHighlight && seg.netName === highlightedNet;
        const [sx1, sy1] = toScreen(seg.x1, seg.y1);
        const [sx2, sy2] = toScreen(seg.x2, seg.y2);

        ctx.globalAlpha = hasNetHighlight ? (isMatched ? 1.0 : 0.28) : 0.9;
        ctx.strokeStyle = isMatched ? '#00e676' : baseColor;
        ctx.lineWidth = Math.max(1, seg.width * cam.scale * (isMatched ? 1.4 : 1.0));
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
      ctx.restore();
    };

    // 3. Back Copper (B.Cu)
    if (layers.bCu) {
      drawSegments('B.Cu', '#3b82f6');
    }

    // 4. Front Copper (F.Cu)
    if (layers.fCu) {
      drawSegments('F.Cu', '#ef4444');
    }

    // 5. Plated Vias
    if (board.vias.length > 0) {
      ctx.save();
      for (const via of board.vias) {
        const [sx, sy] = toScreen(via.x, via.y);
        const isMatched = hasNetHighlight && via.netName === highlightedNet;
        const outerR = Math.max(2.2, (via.size / 2) * cam.scale);
        const innerR = Math.max(1.0, (via.drill / 2) * cam.scale);
        ctx.globalAlpha = hasNetHighlight ? (isMatched ? 1.0 : 0.28) : 1.0;

        ctx.beginPath();
        ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
        ctx.fillStyle = isMatched ? '#00e676' : '#d8dee9';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, innerR, 0, Math.PI * 2);
        ctx.fillStyle = '#111214';
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Footprint Courtyards (F.CrtYd) & Silkscreen (F.SilkS)
    for (const fp of board.footprints) {
      if (layers.crtyd && fp.crtydLines.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
        ctx.lineWidth = 1;
        for (const l of fp.crtydLines) {
          const [rx1, ry1] = rotatePt(l.x1, l.y1, fp.rot);
          const [rx2, ry2] = rotatePt(l.x2, l.y2, fp.rot);
          const [sx1, sy1] = toScreen(fp.x + rx1, fp.y + ry1);
          const [sx2, sy2] = toScreen(fp.x + rx2, fp.y + ry2);
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (layers.silk && fp.silkLines.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.78)';
        ctx.lineWidth = Math.max(1, 0.12 * cam.scale);
        ctx.lineCap = 'round';
        for (const l of fp.silkLines) {
          const [rx1, ry1] = rotatePt(l.x1, l.y1, fp.rot);
          const [rx2, ry2] = rotatePt(l.x2, l.y2, fp.rot);
          const [sx1, sy1] = toScreen(fp.x + rx1, fp.y + ry1);
          const [sx2, sy2] = toScreen(fp.x + rx2, fp.y + ry2);
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 7. Selected Footprint Highlight Box
    if (selectedRef) {
      const selFp = board.footprints.find((f) => f.ref === selectedRef);
      if (selFp) {
        const [bx0, by0, bx1, by1] = selFp.bbox;
        const corners: Array<[number, number]> = [
          [bx0, by0],
          [bx1, by0],
          [bx1, by1],
          [bx0, by1],
        ];
        ctx.save();
        ctx.beginPath();
        corners.forEach(([lx, ly], idx) => {
          const [rx, ry] = rotatePt(lx, ly, selFp.rot);
          const [sx, sy] = toScreen(selFp.x + rx, selFp.y + ry);
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 230, 118, 0.12)';
        ctx.fill();
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 8. Pads
    for (const fp of board.footprints) {
      for (const pd of fp.pads) {
        const [rx, ry] = rotatePt(pd.px, pd.py, fp.rot);
        const [sx, sy] = toScreen(fp.x + rx, fp.y + ry);
        const pw = Math.max(2, pd.w * cam.scale);
        const ph = Math.max(2, pd.h * cam.scale);
        const isMatched = hasNetHighlight && pd.netName !== '' && pd.netName === highlightedNet;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate((-pd.ang * Math.PI) / 180);
        ctx.globalAlpha = hasNetHighlight ? (isMatched ? 1.0 : 0.28) : 1.0;

        let fill = '#d9a940';
        if (isMatched) fill = '#00e676';
        else if (pd.type === 'thru_hole') fill = '#eab308';
        else if (pd.type === 'np_thru_hole') fill = '#475569';

        ctx.fillStyle = fill;
        if (pd.shape === 'circle' || pd.shape === 'oval') {
          drawRoundedRectPath(ctx, -pw / 2, -ph / 2, pw, ph, Math.min(pw, ph) / 2);
          ctx.fill();
        } else if (pd.shape === 'roundrect') {
          drawRoundedRectPath(ctx, -pw / 2, -ph / 2, pw, ph, Math.min(pw, ph) * 0.22);
          ctx.fill();
        } else {
          ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
        }

        if (pd.drill > 0) {
          const drillRx = Math.max(1, (pd.drill / 2) * cam.scale);
          const drillRy = Math.max(1, ((pd.drillY ?? pd.drill) / 2) * cam.scale);
          ctx.beginPath();
          ctx.ellipse(0, 0, drillRx, drillRy, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#111214';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 9. Reference Labels
    if (layers.silk && cam.scale >= 4.5) {
      ctx.save();
      const fontSize = Math.max(9, Math.min(13, cam.scale * 0.65));
      ctx.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const fp of board.footprints) {
        const [sx, sy] = toScreen(fp.x, fp.y);
        const isSelected = fp.ref === selectedRef;
        ctx.fillStyle = isSelected ? '#00e676' : 'rgba(236, 238, 242, 0.92)';
        ctx.strokeStyle = 'rgba(8, 27, 21, 0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(fp.ref, sx, sy);
        ctx.fillText(fp.ref, sx, sy);
      }
      ctx.restore();
    }
  }, [board, camera2d, highlightedNet, layers, selectedRef]);

  // Observe container resizes to redraw smoothly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      // trigger lightweight re-render by nudging state only if needed
      setCamera2d((prev) => ({ ...prev }));
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [setCamera2d]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const [wxBefore, wyBefore] = screenToWorld(sx, sy, camera2d, rect.width, rect.height);
    const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
    const nextScale = Math.max(2, Math.min(90, camera2d.scale * factor));

    const nextCx = wxBefore - (sx - rect.width / 2) / nextScale;
    const nextCy = wyBefore - (sy - rect.height / 2) / nextScale;
    setCamera2d({ cx: nextCx, cy: nextCy, scale: nextScale });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startCx: camera2d.cx,
      startCy: camera2d.cy,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const [wx, wy] = screenToWorld(sx, sy, camera2d, rect.width, rect.height);
    setCursorMm({ x: wx, y: wy });

    const drag = dragStateRef.current;
    if (!drag.active) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 4) {
      drag.moved = true;
    }

    setCamera2d({
      ...camera2d,
      cx: drag.startCx - dx / camera2d.scale,
      cy: drag.startCy - dy / camera2d.scale,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active) return;
    drag.active = false;

    if (drag.moved || !board || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [wx, wy] = screenToWorld(sx, sy, camera2d, rect.width, rect.height);

    // Hit-test footprints
    let hitRef: string | null = null;
    for (let i = board.footprints.length - 1; i >= 0; i -= 1) {
      if (hitTestFootprint(board.footprints[i], wx, wy, 0.5)) {
        hitRef = board.footprints[i].ref;
        break;
      }
    }

    if (hitRef) {
      selectComponent(hitRef);
      return;
    }

    // Check if user clicked near a pad or trace to toggle net highlight
    let clickedNet: string | null = null;
    for (const seg of board.segments) {
      const lenSq = (seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2;
      if (lenSq < 1e-6) continue;
      const t = Math.max(
        0,
        Math.min(1, ((wx - seg.x1) * (seg.x2 - seg.x1) + (wy - seg.y1) * (seg.y2 - seg.y1)) / lenSq),
      );
      const px = seg.x1 + t * (seg.x2 - seg.x1);
      const py = seg.y1 + t * (seg.y2 - seg.y1);
      if (Math.hypot(wx - px, wy - py) <= Math.max(0.45, seg.width)) {
        clickedNet = seg.netName || null;
        break;
      }
    }

    if (clickedNet) {
      setHighlightedNet(highlightedNet === clickedNet ? null : clickedNet);
    } else {
      selectComponent(null);
      setHighlightedNet(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="cad-grid-bg relative h-full w-full overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          dragStateRef.current.active = false;
          setCursorMm(null);
        }}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      />
      {!board && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel)]/90 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-[var(--text)]">No PCB layout yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Use the AI Copilot or Pipeline tab to generate or upload a `.kicad_pcb` board.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
