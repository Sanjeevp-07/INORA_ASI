// frontend/src/components/EEGWaveform.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  WHY OWN WEBSOCKET:
//    Backend sends 1 sample per message at ~100msg/s.
//    React state (setEegData in Demo.jsx) only re-renders ~10x/s,
//    so 90% of samples were dropped before EEGWaveform ever saw them.
//    This component opens its own WS and pushes EVERY sample directly
//    into ring buffers (plain arrays in a ref) — zero samples lost.
//
//  Backend message format (your main.py):
//    { live_intent, confidence, eeg: { ch1, ch2, ch3 } }
//
//  Controls:
//    ↑ / ↓  arrow keys  →  zoom in / out (µV scale)
//    A / S / D           →  select Ch1 / Ch2 / Ch3
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const WS_URL   = "ws://localhost:8000/ws/eeg";
const FS       = 250;
const WIN_SEC  = 5;
const BUF_SIZE = FS * WIN_SEC;   // 1250 samples
const SPF      = Math.ceil(FS / 30);

const SCALE_STEPS   = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];
const DEFAULT_SCALE = 5;  // index → ±50 µV
const YAXIS_W       = 42; // px for Y-axis column

const COLORS_DARK  = ["#00ff41", "#00c8ff", "#ff9500"];
const COLORS_LIGHT = ["#007a20", "#0077aa", "#cc5500"];
const LABELS       = ["Ch1 — Fp1", "Ch2 — Fp2", "Ch3 — Cz"];
const KEY_CH       = { a: 0, s: 1, d: 2 };

// ── HP filter (0.5 Hz RC) ─────────────────────────────────────────────────────
function applyHP(arr) {
  const alpha = 0.995;
  const out = new Float64Array(arr.length);
  for (let i = 1; i < arr.length; i++)
    out[i] = alpha * (out[i - 1] + arr[i] - arr[i - 1]);
  return out;
}

// ── Simulation ────────────────────────────────────────────────────────────────
const SIM_CFG = [
  [[10, 25], [20, 12], [8, 18]],
  [[10, 22], [18, 14], [9, 16]],
  [[ 9, 20], [22, 10], [7, 15]],
];
function simSample(t, phase, ch) {
  let v = 0;
  for (const [f, a] of SIM_CFG[ch])
    v += a * Math.sin(2 * Math.PI * f * t + phase);
  v += (Math.random() - 0.5) * 6;
  if (Math.random() < 0.0008) v += (Math.random() > 0.5 ? 60 : -60);
  return v;
}

// ── Y-axis ────────────────────────────────────────────────────────────────────
function drawYAxis(ctx, W, H, yRange, color, lightMode) {
  const labelCol = lightMode ? "rgba(0,20,80,0.50)" : "rgba(160,200,255,0.50)";
  const gridCol  = lightMode ? "rgba(0,20,80,0.08)" : "rgba(255,255,255,0.07)";

  // Axis strip background
  ctx.fillStyle = lightMode ? "rgba(0,10,40,0.04)" : "rgba(0,0,0,0.40)";
  ctx.fillRect(0, 0, YAXIS_W, H);

  // Axis border
  ctx.strokeStyle = lightMode ? "rgba(0,20,80,0.14)" : "rgba(255,255,255,0.10)";
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(YAXIS_W, 0); ctx.lineTo(YAXIS_W, H); ctx.stroke();

  // Tick interval — target ~4–5 ticks per side
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200];
  let tickInterval = yRange;
  for (const c of candidates) {
    if (yRange / c <= 5) { tickInterval = c; break; }
  }

  ctx.font = "bold 7.5px 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let uv = -yRange; uv <= yRange + 0.001; uv += tickInterval) {
    const y = H / 2 - (uv / yRange) * (H * 0.46);
    if (y < 4 || y > H - 4) continue;
    const isZero = Math.abs(uv) < 0.001;

    // Horizontal grid line (across signal area)
    ctx.strokeStyle  = isZero
      ? (lightMode ? "rgba(0,20,80,0.18)" : "rgba(255,255,255,0.14)")
      : gridCol;
    ctx.lineWidth    = isZero ? 0.9 : 0.5;
    ctx.setLineDash(isZero ? [] : [3, 5]);
    ctx.beginPath();
    ctx.moveTo(YAXIS_W, y); ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tick mark
    ctx.strokeStyle = labelCol;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(YAXIS_W - 4, y); ctx.lineTo(YAXIS_W, y);
    ctx.stroke();

    // Label
    const label = isZero ? "0" : `${uv > 0 ? "+" : ""}${uv.toFixed(0)}`;
    ctx.fillStyle = isZero ? color + "cc" : labelCol;
    ctx.fillText(label, YAXIS_W - 6, y);
  }

  // Rotated "µV" unit
  ctx.save();
  ctx.translate(7, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "6.5px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = labelCol;
  ctx.fillText("µV", 0, 0);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// ── Channel ───────────────────────────────────────────────────────────────────
function Channel({ ch, buf, hasLive, isConnected, lightMode, scaleIdxRef, selected }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(Math.random() * 100);
  const phaseRef  = useRef(ch * 1.1 + Math.random() * 0.3);
  const COLOR     = (lightMode ? COLORS_LIGHT : COLORS_DARK)[ch];
  const H_CANVAS  = selected ? 108 : 78;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const frame = () => {
      if (isConnected.current) {
        // ── LIVE: real samples flow in via WS onmessage ──
        // nothing to push here

      } else if (!hasLive.current) {
        // ── NEVER connected: run simulation as demo ──
        for (let s = 0; s < SPF; s++) {
          tRef.current += 1 / FS;
          buf[ch].push(simSample(tRef.current, phaseRef.current, ch));
          if (buf[ch].length > BUF_SIZE) buf[ch].shift();
        }

      }
      // ── DISCONNECTED after live: buf already wiped to zeros on close ──
      // nothing to push — flat line renders from the zeroed buffer

      const raw = buf[ch];
      const W   = canvas.offsetWidth || 600;
      if (canvas.width !== W) canvas.width = W;
      const H = canvas.height;

      // Background
      ctx.fillStyle = lightMode ? "#f0f3f9" : "#060a10";
      ctx.fillRect(0, 0, W, H);

      const yRange = SCALE_STEPS[scaleIdxRef.current];

      // Y-axis (also draws horizontal grid lines)
      drawYAxis(ctx, W, H, yRange, COLOR, lightMode);

      // Vertical time grid
      ctx.strokeStyle = lightMode ? "rgba(0,20,80,0.05)" : "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 8; i++) {
        const x = YAXIS_W + (W - YAXIS_W) / 8 * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }

      if (raw.length < 30) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const sig  = applyHP(raw);
      const toY  = v => H / 2 - (v / yRange) * (H * 0.46);
      const sigW = W - YAXIS_W;
      const dx   = sigW / (sig.length - 1);

      // Fill above zero
      ctx.beginPath();
      ctx.moveTo(YAXIS_W, H / 2);
      for (let i = 0; i < sig.length; i++)
        ctx.lineTo(YAXIS_W + i * dx, Math.min(toY(sig[i]), H / 2));
      ctx.lineTo(YAXIS_W + (sig.length - 1) * dx, H / 2);
      ctx.closePath();
      ctx.fillStyle = COLOR + "1e"; ctx.fill();

      // Fill below zero
      ctx.beginPath();
      ctx.moveTo(YAXIS_W, H / 2);
      for (let i = 0; i < sig.length; i++)
        ctx.lineTo(YAXIS_W + i * dx, Math.max(toY(sig[i]), H / 2));
      ctx.lineTo(YAXIS_W + (sig.length - 1) * dx, H / 2);
      ctx.closePath();
      ctx.fillStyle = COLOR + "1e"; ctx.fill();

      // Glow (dark mode)
      if (!lightMode) {
        ctx.beginPath();
        for (let i = 0; i < sig.length; i++)
          i === 0
            ? ctx.moveTo(YAXIS_W, toY(sig[0]))
            : ctx.lineTo(YAXIS_W + i * dx, toY(sig[i]));
        ctx.strokeStyle = COLOR + "44";
        ctx.lineWidth   = selected ? 6 : 4;
        ctx.shadowColor = COLOR;
        ctx.shadowBlur  = selected ? 18 : 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Main line
      ctx.beginPath();
      for (let i = 0; i < sig.length; i++)
        i === 0
          ? ctx.moveTo(YAXIS_W, toY(sig[0]))
          : ctx.lineTo(YAXIS_W + i * dx, toY(sig[i]));
      ctx.strokeStyle = COLOR;
      ctx.lineWidth   = selected ? 2.2 : 1.6;
      ctx.shadowColor = COLOR;
      ctx.shadowBlur  = lightMode ? 0 : (selected ? 8 : 4);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Overlays ──────────────────────────────────────────
      ctx.font = "bold 8px 'Courier New', monospace";

      // Clipping warning
      const peak = Math.max(...sig.map(Math.abs));
      if (peak > yRange * 0.92) {
        ctx.fillStyle = "#ff3344";
        ctx.textAlign = "right";
        ctx.fillText("⚠ CLIP — press ↓ to zoom out", W - 5, 11);
        ctx.textAlign = "left";
      }

      // LIVE / DISCONNECTED / SIM badge
      if (isConnected.current) {
        ctx.fillStyle = "#00ff41";
        ctx.fillText("● LIVE", YAXIS_W + 5, 11);
      } else if (hasLive.current) {
        ctx.fillStyle = "#ff3344";
        ctx.fillText("● DISCONNECTED", YAXIS_W + 5, 11);
      } else {
        ctx.fillStyle = lightMode ? "rgba(0,20,80,0.30)" : "rgba(255,255,255,0.20)";
        ctx.fillText("◌ SIM", YAXIS_W + 5, 11);
      }

      // Latest sample value
      const lastVal = sig[sig.length - 1];
      if (isFinite(lastVal)) {
        ctx.fillStyle = COLOR + "bb";
        ctx.font = "8px 'Courier New', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${lastVal >= 0 ? "+" : ""}${lastVal.toFixed(1)} µV`, W - 5, 11);
        ctx.textAlign = "left";
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    frame();
    return () => cancelAnimationFrame(rafRef.current);
  }, [lightMode, selected]); // eslint-disable-line

  const bg    = lightMode ? "#f0f3f9" : "#060a10";
  const bdr   = lightMode ? "rgba(0,20,80,0.10)" : "rgba(255,255,255,0.06)";
  const muted = lightMode ? "#667" : "#5a7a9a";

  return (
    <div style={{
      borderRadius: 7, overflow: "hidden",
      border: selected ? `2px solid ${COLOR}` : `1px solid ${bdr}`,
      borderLeft: `3px solid ${COLOR}`,
      background: bg,
      boxShadow: selected && !lightMode ? `0 0 28px ${COLOR}28, 0 0 8px ${COLOR}14` : "none",
      transition: "box-shadow 0.2s, border 0.15s",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 10px 3px", borderBottom: `1px solid ${bdr}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            color: lightMode ? "#111" : "#cde", fontFamily: "monospace",
          }}>
            {LABELS[ch]}
          </span>
          {selected && (
            <span style={{
              fontSize: 8, fontFamily: "monospace", letterSpacing: 1.5,
              color: COLOR, background: COLOR + "18",
              border: `1px solid ${COLOR}44`,
              borderRadius: 3, padding: "1px 5px",
            }}>
              SELECTED · {["A","S","D"][ch]}
            </span>
          )}
        </div>
        <span style={{ fontSize: 8, color: muted, letterSpacing: 1.2, fontFamily: "monospace" }}>
          HP 0.5Hz · LP 45Hz · Notch 50Hz
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        height={H_CANVAS}
        style={{ width: "100%", height: H_CANVAS, display: "block" }}
      />

      {/* RMS footer */}
      <RMSBar ch={ch} buf={buf} color={COLOR} lightMode={lightMode} bg={bg} muted={muted} />
    </div>
  );
}

// ── RMS footer ────────────────────────────────────────────────────────────────
function RMSBar({ ch, buf, color, lightMode, bg, muted }) {
  const barRef  = useRef(null);
  const valRef  = useRef(null);
  const qualRef = useRef(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (buf[ch].length > 30) {
        const sig = applyHP(buf[ch]);
        const rms = Math.sqrt(sig.reduce((s, v) => s + v * v, 0) / sig.length);
        const pct = Math.min(rms / 30, 1);
        const q   = pct > 0.80 ? "Strong" : pct > 0.55 ? "Good"
                  : pct > 0.30 ? "Moderate" : pct > 0.10 ? "Weak" : "Poor";
        if (barRef.current)  barRef.current.style.width  = `${pct * 100}%`;
        if (valRef.current)  valRef.current.textContent  = `${rms.toFixed(1)} µV`;
        if (qualRef.current) qualRef.current.textContent = q;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "3px 10px 4px", background: bg,
    }}>
      <span style={{ fontSize: 7, color: muted, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>
        rms
      </span>
      <div style={{
        flex: 1, height: 2, borderRadius: 1,
        background: lightMode ? "rgba(0,20,80,0.09)" : "rgba(255,255,255,0.05)",
      }}>
        <div ref={barRef} style={{
          height: "100%", width: "0%", borderRadius: 1,
          background: `linear-gradient(90deg,${color}44,${color})`,
          boxShadow: lightMode ? "none" : `0 0 5px ${color}88`,
          transition: "width 0.35s ease",
        }} />
      </div>
      <span ref={qualRef} style={{ fontSize: 8, color: muted, minWidth: 52, fontFamily: "monospace" }}>—</span>
      <span ref={valRef}  style={{ fontSize: 8, color, minWidth: 52, textAlign: "right", fontFamily: "monospace" }}>—</span>
    </div>
  );
}

// ── Scale HUD ─────────────────────────────────────────────────────────────────
function ScaleHUD({ scaleIdx, lightMode }) {
  const accent = lightMode ? "#0077aa" : "#00c8ff";
  const muted  = lightMode ? "#3a5070" : "#aabbd0";
  const bg     = lightMode ? "rgba(0,20,80,0.05)" : "rgba(0,10,30,0.65)";
  const bdr    = lightMode ? "rgba(0,20,80,0.12)" : "rgba(255,255,255,0.07)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "5px 12px", borderRadius: 6,
      background: bg, border: `1px solid ${bdr}`,
      fontFamily: "'Courier New', monospace",
    }}>
      <span style={{ fontSize: 9, letterSpacing: 2, color: muted, textTransform: "uppercase" }}>Scale</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: accent, minWidth: 64 }}>
        ±{SCALE_STEPS[scaleIdx]} µV
      </span>

      {/* Position dots */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        {SCALE_STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === scaleIdx ? 10 : 4, height: 4, borderRadius: 2,
            background: i === scaleIdx
              ? accent
              : (lightMode ? "rgba(0,20,80,0.15)" : "rgba(255,255,255,0.10)"),
            transition: "all 0.15s",
          }} />
        ))}
      </div>

      <div style={{ width: 1, height: 14, background: bdr }} />

      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Kbd>↑</Kbd>
        <span style={{ fontSize: 8, color: muted }}>zoom in</span>
        <Kbd>↓</Kbd>
        <span style={{ fontSize: 8, color: muted }}>zoom out</span>
      </div>

      <div style={{ width: 1, height: 14, background: bdr }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {[["A","Ch1"],["S","Ch2"],["D","Ch3"]].map(([k,l]) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Kbd>{k}</Kbd>
            <span style={{ fontSize: 8, color: muted }}>{l}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 17, height: 15, padding: "0 3px",
      fontSize: 8, fontFamily: "'Courier New', monospace", fontWeight: 700,
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderBottom: "2px solid rgba(0,0,0,0.25)",
      borderRadius: 3, color: "#cde",
    }}>
      {children}
    </span>
  );
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
export default function EEGWaveform({ active = false, lightMode = false }) {
  // Plain arrays in a ref — NEVER cause re-renders, never lose samples
  const buf          = useRef([[],[],[]]);
  const hasLive      = useRef(false);  // true once backend sent ≥1 sample
  const isConnected  = useRef(false);  // true only while WS is open
  const scaleIdxRef  = useRef(DEFAULT_SCALE);

  const [scaleIdx,   setScaleIdx]   = useState(DEFAULT_SCALE);
  const [selectedCh, setSelectedCh] = useState(0);

  // ── Own WebSocket ────────────────────────────────────────────────────────
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen  = () => {
          isConnected.current = true;
          console.log("[EEGWaveform] WS connected");
        };
        ws.onerror = () => {
          isConnected.current = false;
        };
        ws.onclose = () => {
          isConnected.current = false;
          // Immediately wipe buffers → instant flat line, no stale spikes
          if (hasLive.current) {
            for (let i = 0; i < 3; i++) {
              buf.current[i] = new Array(BUF_SIZE).fill(0);
            }
          }
          console.log("[EEGWaveform] WS closed — reconnecting in 2s");
          reconnectTimer = setTimeout(connect, 2000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            // ── Your main.py format ──────────────────────────────────────────
            // { live_intent, confidence, eeg: { ch1, ch2, ch3 } }
            if (msg.eeg && typeof msg.eeg === "object") {
              hasLive.current = true;
              const { ch1 = 0, ch2 = 0, ch3 = 0 } = msg.eeg;
              [ch1, ch2, ch3].forEach((v, i) => {
                buf.current[i].push(Number(v));
                if (buf.current[i].length > BUF_SIZE) buf.current[i].shift();
              });
              return;
            }

            // ── Batch format (if you ever switch) ───────────────────────────
            // { type:"eeg_stream", samples:[{ch1,ch2,ch3},...] }
            if (msg.type === "eeg_stream" && Array.isArray(msg.samples)) {
              hasLive.current = true;
              for (const s of msg.samples) {
                [s.ch1 ?? 0, s.ch2 ?? 0, s.ch3 ?? 0].forEach((v, i) => {
                  buf.current[i].push(Number(v));
                  if (buf.current[i].length > BUF_SIZE) buf.current[i].shift();
                });
              }
            }
          } catch (_) { /* ignore parse errors */ }
        };
      } catch (_) {
        reconnectTimer = setTimeout(connect, 2000);
      }
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      try { ws.close(); } catch (_) {}
    };
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const onKey = useCallback((e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setScaleIdx(prev => {
        const next = Math.max(0, prev - 1);
        scaleIdxRef.current = next;
        return next;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setScaleIdx(prev => {
        const next = Math.min(SCALE_STEPS.length - 1, prev + 1);
        scaleIdxRef.current = next;
        return next;
      });
    } else {
      const ch = KEY_CH[e.key.toLowerCase()];
      if (ch !== undefined) setSelectedCh(ch);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <ScaleHUD scaleIdx={scaleIdx} lightMode={lightMode} />
      {[0, 1, 2].map(i => (
        <Channel
          key={i}
          ch={i}
          buf={buf.current}
          hasLive={hasLive}
          isConnected={isConnected}
          lightMode={lightMode}
          scaleIdxRef={scaleIdxRef}
          selected={selectedCh === i}
        />
      ))}
    </div>
  );
}