import React, { useState, useRef } from "react";

const C = {
  panel:  "#0d1422",
  border: "rgba(255,255,255,0.10)",
  muted:  "#6a8aaa",
  bright: "#deeeff",
  green:  "#00ffb4",
  cyan:   "#00c8ff",
  red:    "#ff4466",
  dim:    "#2e3e52",
};

export default function QuestionRecorder({ onQuestion }) {
  const [recording, setRecording]   = useState(false);
  const [question, setQuestion]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [micLevel, setMicLevel]     = useState(0);
  const mediaRecorderRef            = useRef(null);
  const audioChunks                 = useRef([]);
  const analyserRef                 = useRef(null);
  const animFrameRef                = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Mic level visualisation
      const ctx     = new AudioContext();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const trackLevel = () => {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setMicLevel(avg / 128);
        animFrameRef.current = requestAnimationFrame(trackLevel);
      };
      trackLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.current.push(e.data);

      mediaRecorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        setMicLevel(0);
        setLoading(true);
        try {
          const blob = new Blob(audioChunks.current, { type: "audio/wav" });
          const form = new FormData();
          form.append("file", blob, "question.wav");
          const res  = await fetch("http://127.0.0.1:8000/ask", { method: "POST", body: form });
          const data = await res.json();
          setQuestion(data.question || "");
          if (data.question && onQuestion) onQuestion();
        } catch (err) {
          console.error("QuestionRecorder upload error:", err);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const activeColor = recording ? C.red : C.cyan;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Button */}
      <button
        onClick={recording ? stopRecording : startRecording}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "8px 14px",
          background: recording ? `${C.red}18` : `${C.cyan}14`,
          border: `1px solid ${activeColor}66`,
          borderRadius: 5,
          color: activeColor,
          fontSize: 11, letterSpacing: 2, fontFamily: "monospace",
          cursor: "pointer",
          boxShadow: recording ? `0 0 12px ${C.red}33` : "none",
          transition: "all 0.3s",
          width: "100%",
        }}
      >
        {/* Live mic level bar */}
        {recording && (
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: C.red,
            boxShadow: `0 0 8px ${C.red}`,
            animation: "recPulse 0.6s infinite alternate",
          }} />
        )}
        {loading ? "PROCESSING…" : recording ? "STOP" : "● ASK"}
      </button>

      {/* Mic level bars */}
      {recording && (
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 18 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: `${20 + Math.sin(i * 0.8 + Date.now() * 0.01) * 50 * micLevel}%`,
              background: C.red,
              borderRadius: 1,
              opacity: 0.7 + micLevel * 0.3,
              transition: "height 0.08s ease",
            }} />
          ))}
        </div>
      )}

      {/* Transcription result */}
      {question && (
        <div style={{
          padding: "6px 8px",
          background: "rgba(0,0,0,0.3)",
          border: `1px solid ${C.cyan}33`,
          borderRadius: 4,
          fontSize: 11,
          color: C.bright,
          lineHeight: 1.5,
          fontFamily: "monospace",
        }}>
          <span style={{ color: C.muted, fontSize: 9, letterSpacing: 2, display: "block", marginBottom: 3 }}>TRANSCRIBED</span>
          {question}
        </div>
      )}

      <style>{`@keyframes recPulse { from { opacity: 1; } to { opacity: 0.3; } }`}</style>
    </div>
  );
}