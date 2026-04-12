import { useEffect, useState } from "react";

export default function Avatar({ speaking = false }) {
  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [mouthState, setMouthState] = useState("neutral");

  /* -------- Natural Blink -------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 90);
    }, 2200 + Math.random() * 1200);
    return () => clearInterval(interval);
  }, []);

  /* -------- Eye Movement -------- */
  useEffect(() => {
    if (!speaking) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }

    const interval = setInterval(() => {
      setEyeOffset({
        x: Math.random() * 3 - 1.5,
        y: Math.random() * 3 - 1.5,
      });
    }, 140);

    return () => clearInterval(interval);
  }, [speaking]);

  /* -------- Mouth Animation -------- */
  useEffect(() => {
    if (!speaking) {
      setMouthState("neutral");
      return;
    }

    const states = ["small", "wide", "round"];
    const interval = setInterval(() => {
      setMouthState(states[Math.floor(Math.random() * states.length)]);
    }, 120);

    return () => clearInterval(interval);
  }, [speaking]);

  return (
    <div className="flex items-center justify-center w-full h-full bg-gradient-to-b from-[#f2f4f7] to-[#e6ebf1]">
      {/* HEAD SHELL */}
      <div
        style={{
          width: "440px",
          height: "330px",
          background:
            "linear-gradient(145deg, #ffffff 0%, #e7ebf0 100%)",
          borderRadius: "170px",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.18), inset 0 2px 8px rgba(255,255,255,0.6)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* SIDE MODULES */}
        {["left", "right"].map((side) => (
          <div
            key={side}
            style={{
              position: "absolute",
              [side]: "-35px",
              width: "65px",
              height: "120px",
              background:
                "linear-gradient(145deg, #ffffff 0%, #e7ebf0 100%)",
              borderRadius: "70px",
              boxShadow:
                "inset 0 6px 14px rgba(0,0,0,0.08)",
            }}
          />
        ))}

        {/* VISOR SCREEN */}
        <div
          style={{
            width: "360px",
            height: "300px",
            borderRadius: "120px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 50% 40%, #111 0%, #000 70%)",
            boxShadow:
              "inset 0 0 40px rgba(255,255,255,0.05)",
          }}
        >
          {/* Subtle Glass Reflection */}
          <div
            style={{
              position: "absolute",
              top: 0,
              width: "100%",
              height: "45%",
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)",
              borderTopLeftRadius: "120px",
              borderTopRightRadius: "120px",
            }}
          />

          {/* EYES */}
          <div style={{ display: "flex", gap: "90px", marginBottom: "110px" }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: "60px",
                  height: blink ? "6px" : "60px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, #ffffff 60%, #e8e8e8 100%)",
                  boxShadow:
                    "0 0 20px rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.1s ease",
                }}
              >
                {!blink && (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#fff",
                      transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* MOUTH */}
          <div
            style={{
              position: "absolute",
              bottom: "55px",
              width:
                mouthState === "wide"
                  ? "135px"
                  : mouthState === "round"
                  ? "85px"
                  : "110px",
              height:
                mouthState === "wide"
                  ? "70px"
                  : mouthState === "round"
                  ? "70px"
                  : "45px",
              background:
                "radial-gradient(circle at center, #ffffff 70%, #eaeaea 100%)",
              borderRadius:
                mouthState === "round"
                  ? "50%"
                  : "70px 70px 120px 120px",
              boxShadow:
                "0 0 18px rgba(255,255,255,0.35)",
              transition: "all 0.12s ease",
              opacity: 0.95,
            }}
          />
        </div>

        {/* NECK SHADOW DEPTH */}
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            width: "250px",
            height: "60px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(20,25,45,0.6) 0%, transparent 70%)",
            filter: "blur(15px)",
          }}
        />
      </div>
    </div>
  );
}