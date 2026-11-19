"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const BOOT_FLAG = "us_3d_boot_v2";

interface Vec3 { x: number; y: number; z: number; }

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_VERTS: Vec3[] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
].map(([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
});

const ICO_EDGES: [number, number][] = [];
for (let i = 0; i < ICO_VERTS.length; i++) {
  for (let j = i + 1; j < ICO_VERTS.length; j++) {
    const d = Math.hypot(
      ICO_VERTS[i].x - ICO_VERTS[j].x,
      ICO_VERTS[i].y - ICO_VERTS[j].y,
      ICO_VERTS[i].z - ICO_VERTS[j].z
    );
    if (d < 1.15) ICO_EDGES.push([i, j]);
  }
}

const OCT_VERTS: Vec3[] = [
  { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
  { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
];
const OCT_EDGES: [number, number][] = [
  [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 2], [1, 3], [1, 4], [1, 5],
  [2, 4], [4, 3], [3, 5], [5, 2],
];

function rot3(v: Vec3, ax: number, ay: number, az: number): Vec3 {
  let { x, y, z } = v;
  let c = Math.cos(ax), s = Math.sin(ax);
  let y1 = y * c - z * s; let z1 = y * s + z * c; y = y1; z = z1;
  c = Math.cos(ay); s = Math.sin(ay);
  let x1 = x * c + z * s; z1 = -x * s + z * c; x = x1; z = z1;
  c = Math.cos(az); s = Math.sin(az);
  x1 = x * c - y * s; y1 = x * s + y * c;
  return { x: x1, y: y1, z };
}

export default function SaturnLoader({ overlay = false }: { overlay?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runId, setRunId] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const warpRef = useRef(false);

  const finish = useCallback(() => {
    warpRef.current = true;
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      setFading(false);
      warpRef.current = false;
      if (typeof window !== "undefined") sessionStorage.setItem(BOOT_FLAG, "1");
    }, 520);
  }, []);

  useEffect(() => {
    const onReplay = () => {
      if (typeof window !== "undefined") sessionStorage.removeItem(BOOT_FLAG);
      warpRef.current = false;
      setFading(false);
      setProgress(0);
      setVisible(true);
      setRunId((n) => n + 1);
    };
    window.addEventListener("us:replay-intro", onReplay);
    return () => window.removeEventListener("us:replay-intro", onReplay);
  }, []);

  useEffect(() => {
    if (!overlay) { setVisible(true); return; }
    if (typeof window !== "undefined" && sessionStorage.getItem(BOOT_FLAG) === "1" && runId === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setFading(false);
    warpRef.current = false;
    setProgress(0);

    const start = performance.now();
    const duration = 2200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(Math.round((1 - Math.pow(1 - p, 2.3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, [overlay, runId, finish]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const stars = Array.from({ length: 160 }, () => ({
      x: (Math.random() - 0.5) * 1800,
      y: (Math.random() - 0.5) * 1100,
      z: Math.random() * 1200 + 80,
      hue: Math.random() > 0.45 ? 270 : 305,
    }));

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / Math.max(1, w) - 0.5) * 2;
      mouseRef.current.y = (e.clientY / Math.max(1, h) - 0.5) * 2;
    };
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);

    let t = 0;
    const render = () => {
      t += warpRef.current ? 0.065 : 0.018;
      const cx = w * 0.5 + mouseRef.current.x * 18;
      const cy = h * 0.45 + mouseRef.current.y * 14;
      const fov = 560;
      const scale = Math.min(w, h) * 0.175 * (warpRef.current ? 1.35 : 1);

      ctx.fillStyle = "rgba(6, 5, 14, 0.34)";
      ctx.fillRect(0, 0, w, h);

      // Неоновое свечение ядра
      const aura = ctx.createRadialGradient(cx, cy, 8, cx, cy, scale * 2.2);
      aura.addColorStop(0, "rgba(217, 70, 239, 0.32)");
      aura.addColorStop(0.45, "rgba(139, 92, 246, 0.14)");
      aura.addColorStop(1, "rgba(6, 5, 14, 0)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, w, h);

      // 3D-поток звёзд
      const speed = warpRef.current ? 46 : 9;
      for (const s of stars) {
        const prevZ = s.z;
        s.z -= speed;
        if (s.z <= 12) {
          s.x = (Math.random() - 0.5) * 1800;
          s.y = (Math.random() - 0.5) * 1100;
          s.z = 1200;
          continue;
        }
        const sx = cx + (s.x / s.z) * fov;
        const sy = cy + (s.y / s.z) * fov;
        const px = cx + (s.x / prevZ) * fov;
        const py = cy + (s.y / prevZ) * fov;
        const alpha = Math.min(1, (1 - s.z / 1200) * 1.2);
        ctx.strokeStyle = `hsla(${s.hue}, 90%, 76%, ${alpha})`;
        ctx.lineWidth = Math.max(0.8, (1 - s.z / 1200) * 2.6);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      const project = (v: Vec3, rScale: number) => {
        const z = v.z * rScale + 420;
        const k = fov / Math.max(80, z);
        return { x: cx + v.x * rScale * k, y: cy + v.y * rScale * k, z, k };
      };

      // Двойные 3D гироскопические кольца
      const drawRing = (radius: number, ax: number, ay: number, az: number, color: string) => {
        ctx.beginPath();
        const segs = 72;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          const v = rot3({ x: Math.cos(a), y: Math.sin(a), z: 0 }, ax, ay, az);
          const p = project(v, radius);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      };

      drawRing(scale * 1.65, t * 0.7 + 0.9, t * 1.1, 0.3, "rgba(192, 132, 252, 0.55)");
      drawRing(scale * 1.38, -t * 0.9 + 1.4, t * 0.6, -0.5, "rgba(232, 121, 249, 0.65)");
      drawRing(scale * 1.92, 1.15, -t * 0.45, t * 0.3, "rgba(56, 189, 248, 0.32)");

      // Внешний 3D-икосаэдр
      const rotIco = ICO_VERTS.map((v) =>
        project(rot3(v, t * 0.9 + mouseRef.current.y * 0.4, t * 1.25 + mouseRef.current.x * 0.5, t * 0.3), scale)
      );
      for (const [a, b] of ICO_EDGES) {
        const p1 = rotIco[a], p2 = rotIco[b];
        const depth = Math.max(0.22, Math.min(1, 1.35 - (p1.z + p2.z) / 900));
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, `rgba(139, 92, 246, ${depth})`);
        grad.addColorStop(1, `rgba(232, 121, 249, ${depth})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2 + depth * 1.3;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      for (const p of rotIco) {
        ctx.fillStyle = "#f5d0fe";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4 * p.k, 0, Math.PI * 2);
        ctx.fill();
      }

      // Внутренний 3D-октаэдр (вращается в обратную сторону)
      const rotOct = OCT_VERTS.map((v) =>
        project(rot3(v, -t * 1.4, -t * 1.8, t * 0.7), scale * 0.52)
      );
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.lineWidth = 1.4;
      for (const [a, b] of OCT_EDGES) {
        ctx.beginPath();
        ctx.moveTo(rotOct[a].x, rotOct[a].y);
        ctx.lineTo(rotOct[b].x, rotOct[b].y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(render);
    };

    ctx.fillStyle = "#06050e";
    ctx.fillRect(0, 0, w, h);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`us-3d-loader ${overlay ? "is-overlay" : "is-inline"} ${fading ? "is-fading" : ""}`}>
      <canvas ref={canvasRef} className="us-3d-canvas" aria-hidden="true" />
      <div className="us-3d-hud">
        <div className="us-3d-kicker">UNIFIEDSTACK ENGINE • 3D CORE</div>
        <div className="us-3d-title">UNIFIEDSTACK</div>
        <div className="us-3d-bar">
          <div className="us-3d-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="us-3d-meta">
          <span>Загрузка каталога, медиа и профиля</span>
          <strong>{progress}%</strong>
        </div>
        {overlay && (
          <button type="button" className="us-3d-skip" onClick={finish}>
            Пропустить (Esc)
          </button>
        )}
      </div>
    </div>
  );
}
