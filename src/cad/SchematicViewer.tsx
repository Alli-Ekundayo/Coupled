import { useCallback, useEffect, useRef, useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';

interface SchematicViewerProps {
  svgText: string | null;
  fitTrigger: number;
}

const DISALLOWED_SVG_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'canvas',
  'link',
  'meta',
]);

function sanitizeSvgElement(rawSvg: string): SVGSVGElement | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    return null;
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    return null;
  }

  const walk = (el: Element) => {
    const children = Array.from(el.children);
    for (const child of children) {
      if (DISALLOWED_SVG_TAGS.has(child.tagName.toLowerCase())) {
        child.remove();
        continue;
      }
      walk(child);
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (
        (name === 'href' || name === 'xlink:href' || name === 'src') &&
        (val.startsWith('javascript:') || val.startsWith('data:text/html'))
      ) {
        el.removeAttribute(attr.name);
      }
    }
  };

  walk(root);
  return root as unknown as SVGSVGElement;
}

export function SchematicViewer({ svgText, fitTrigger }: SchematicViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgMountRef = useRef<HTMLDivElement>(null);
  const [parseError, setParseError] = useState(false);

  const transform = useStudioStore((s) => s.schematicTransform);
  const setTransform = useStudioStore((s) => s.setSchematicTransform);
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number }>({
    active: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });

  const fitView = useCallback(() => {
    const vp = viewportRef.current;
    const mount = svgMountRef.current;
    const svgEl = mount?.querySelector('svg');
    if (!vp || !svgEl) return;

    const vb = svgEl.viewBox?.baseVal;
    const sw = vb && vb.width > 0 ? vb.width : Number(svgEl.getAttribute('width')) || 800;
    const sh = vb && vb.height > 0 ? vb.height : Number(svgEl.getAttribute('height')) || 500;
    const vw = Math.max(vp.clientWidth, 100);
    const vh = Math.max(vp.clientHeight, 100);
    const scale = Math.max(0.25, Math.min(3.5, Math.min((vw - 80) / sw, (vh - 80) / sh)));
    const x = (vw - sw * scale) / 2;
    const y = (vh - sh * scale) / 2;
    setTransform({ x, y, scale });
  }, [setTransform]);

  useEffect(() => {
    const mount = svgMountRef.current;
    if (!mount) return;

    if (!svgText) {
      mount.replaceChildren();
      setParseError(false);
      return;
    }

    const cleanSvg = sanitizeSvgElement(svgText);
    if (!cleanSvg) {
      mount.replaceChildren();
      setParseError(true);
      return;
    }

    setParseError(false);
    const imported = document.importNode(cleanSvg, true);
    mount.replaceChildren(imported);
    fitView();
  }, [svgText, fitView]);

  useEffect(() => {
    fitView();
  }, [fitTrigger, fitView]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setTransform((prev) => {
      const nextScale = Math.max(0.2, Math.min(5, prev.scale * factor));
      const ratio = nextScale / prev.scale;
      return {
        x: px - (px - prev.x) * ratio,
        y: py - (py - prev.y) * ratio,
        scale: nextScale,
      };
    });
  };

  return (
    <div
      ref={viewportRef}
      onWheel={handleWheel}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          active: true,
          sx: e.clientX,
          sy: e.clientY,
          ox: transform.x,
          oy: transform.y,
        };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        setTransform({
          ...transform,
          x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
          y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
        });
      }}
      onPointerUp={() => {
        dragRef.current.active = false;
      }}
      className="cad-grid-bg relative h-full w-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      <div
        ref={svgMountRef}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
        }}
        className="inline-block"
      />

      {!svgText && !parseError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel)]/90 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-[var(--text)]">No schematic SVG yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Run AI Design or Stage 2 Netlist to generate a KiCad schematic & SVG preview.
            </p>
          </div>
        </div>
      )}

      {parseError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-[6px] border border-[var(--err)]/40 bg-[var(--bg-panel)] px-5 py-4 text-center text-xs text-[var(--err)]">
            Unable to parse schematic SVG securely.
          </div>
        </div>
      )}
    </div>
  );
}
