import React, { useState, useRef, useEffect } from "react";

const COOLDOWN_MS = 4000;

const MicRecorder = ({ onQuestion, isPlaying }) => {
  const [status, setStatus]               = useState("idle");
  const [transcription, setTranscription] = useState("");

  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const streamRef         = useRef(null);
  const isRecordingRef    = useRef(false);
  const isProcessingRef   = useRef(false);
  const isCooldownRef     = useRef(false);

  useEffect(() => {
    initMic();

    const handleKeyDown = (e) => {
      if (e.code !== "Space")            return;
      if (e.repeat)                      return; // ignore held-down repeat fires
      if (isRecordingRef.current)        return;
      if (isProcessingRef.current)       return;
      if (isCooldownRef.current)         return;
      if (isPlaying)                     return;
      e.preventDefault();                        // stop page from scrolling
      startRecording();
    };

    const handleKeyUp = (e) => {
      if (e.code !== "Space")            return;
      if (!isRecordingRef.current)       return;
      e.preventDefault();
      stopRecording();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup",   handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup",   handleKeyUp);
    };
  }, [isPlaying]);

  const initMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate:       16000,
          channelCount:     1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        }
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = processAudio;

    } catch (err) {
      console.error("Mic access error:", err);
      setStatus("error");
    }
  };

  const startRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "recording") return;

    audioChunksRef.current = [];
    isRecordingRef.current = true;

    mediaRecorderRef.current.start(100); // collect in 100ms chunks
    setStatus("recording");

    if (onQuestion) onQuestion();
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "recording") return;

    isRecordingRef.current  = false;
    isProcessingRef.current = true;
    mediaRecorderRef.current.stop();
    setStatus("processing");
  };

  const processAudio = async () => {
    const mimeType  = mediaRecorderRef.current?.mimeType || "audio/webm";
    const extension = mimeType.includes("ogg") ? "ogg" : "webm";

    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    const formData  = new FormData();
    formData.append("file", audioBlob, `question.${extension}`);

    try {
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        body:   formData,
      });
      const data = await response.json();
      setTranscription(data.question);
    } catch (err) {
      console.error("Error sending audio:", err);
    } finally {
      isProcessingRef.current = false;
      setStatus("cooldown");

      isCooldownRef.current = true;
      setTimeout(() => {
        isCooldownRef.current = false;
        setStatus("idle");
      }, COOLDOWN_MS);
    }
  };

  const dotColor = status === "recording"  ? "#ff4444"
                 : status === "processing" ? "#ffd060"
                 : status === "cooldown"   ? "#00c8ff"
                 : status === "error"      ? "#ff4444"
                 : "#2e3e52";

  const statusLabel = status === "cooldown" ? "waiting"
                    : status === "error"    ? "mic error"
                    : status;

  const hint = status === "idle"       ? "hold SPACE to ask"
             : status === "recording"  ? "release SPACE to send"
             : status === "processing" ? "transcribing..."
             : status === "cooldown"   ? "EEG reading in progress..."
             : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>

      {/* Mic icon with ripple when recording */}
      <div style={{ position: "relative", fontSize: 36 }}>
        {status === "recording" && [0, 1].map(i => (
          <div key={i} style={{
            position:     "absolute",
            inset:        -(12 + i * 10),
            borderRadius: "50%",
            border:       "1px solid #ff4444",
            animation:    `ripple ${0.9 + i * 0.3}s ease-out infinite`,
            animationDelay: `${i * 0.2}s`,
            opacity:      0.5,
          }}/>
        ))}
        <span style={{
          opacity:    status === "cooldown" || isPlaying ? 0.35 : 1,
          transition: "opacity 0.3s",
          fontSize:   36,
        }}>
          🎙
        </span>
      </div>

      {/* Status dot + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{
          width:      6,
          height:     6,
          borderRadius: "50%",
          background: dotColor,
          boxShadow:  status !== "idle" ? `0 0 6px ${dotColor}` : "none",
          transition: "all 0.3s",
        }}/>
        <span style={{
          fontSize:      11,
          letterSpacing: 2,
          fontFamily:    "monospace",
          color:         dotColor,
          fontWeight:    600,
          textTransform: "uppercase",
          transition:    "color 0.3s",
        }}>
          {isPlaying ? "muted" : statusLabel}
        </span>
      </div>

      {/* Hint text */}
      <span style={{
        fontSize:   11,
        color:      "#4a6080",
        fontFamily: "monospace",
        letterSpacing: 1,
      }}>
        {isPlaying ? "muted while playing" : hint}
      </span>

      {/* SPACE bar visual indicator */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        width:        120,
        height:       28,
        borderRadius: 6,
        border:       `1.5px solid ${status === "recording" ? "#ff4444" : "#2e3e52"}`,
        background:   status === "recording" ? "rgba(255,68,68,0.08)" : "rgba(46,62,82,0.3)",
        transition:   "all 0.2s",
      }}>
        <span style={{
          fontSize:      11,
          fontFamily:    "monospace",
          letterSpacing: 2,
          color:         status === "recording" ? "#ff4444" : "#4a6080",
          fontWeight:    600,
        }}>
          SPACE
        </span>
      </div>

      {/* Cooldown progress bar */}
      {status === "cooldown" && (
        <div style={{
          width:        "100%",
          height:       2,
          background:   "rgba(0,200,255,0.15)",
          borderRadius: 1,
          overflow:     "hidden",
        }}>
          <div style={{
            height:     "100%",
            background: "#00c8ff",
            borderRadius: 1,
            animation:  `shrink ${COOLDOWN_MS}ms linear forwards`,
          }}/>
        </div>
      )}

      {/* Transcription result */}
      {transcription && (
        <p style={{
          margin:     0,
          fontSize:   11,
          color:      "#6a9aff",
          fontFamily: "monospace",
          textAlign:  "center",
          lineHeight: 1.4,
          opacity:    0.8,
        }}>
          "{transcription}"
        </p>
      )}

      <style>{`
        @keyframes ripple {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default MicRecorder;