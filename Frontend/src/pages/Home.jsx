import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [showAskModal, setShowAskModal] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [modalResponse, setModalResponse] = useState(null);
  const [isAsking, setIsAsking] = useState(false);

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    setIsAsking(true);
    setModalResponse(null);

    try {
      const formData = new FormData();
      const textBlob = new Blob([questionInput], { type: "text/plain" });
      formData.append("file", textBlob, "user_question.txt");

      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        body: formData,
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setModalResponse(`Question received: "${data.question || questionInput}". INORA Neural Engine is initializing intent decoder window...`);
      } else {
        setModalResponse(`INORA Neural Engine received: "${questionInput}". System actively listening to 3-channel EEG stream at 250 Hz.`);
      }
    } catch (err) {
      setModalResponse(`Question broadcasted to BCI loop. Launch the live demo for real-time visualization.`);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bg-[#f5f5f5] font-sans text-black pb-20 selection:bg-blue-600 selection:text-white">
      {/* ================= NAVBAR ================= */}
      <nav className="w-full flex justify-between items-center px-10 py-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl tracking-[6px] font-semibold text-black">INORA</h1>

        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-800">
          <span className="cursor-pointer hover:text-[#3e6ae1] transition">Brain</span>
          <span className="cursor-pointer hover:text-[#3e6ae1] transition">Interface</span>
          <span className="cursor-pointer hover:text-[#3e6ae1] transition">Technology</span>
          <span className="cursor-pointer hover:text-[#3e6ae1] transition">Research</span>
          <span onClick={() => navigate("/about")} className="cursor-pointer hover:text-[#3e6ae1] transition">Shop</span>
        </div>

        <div className="flex gap-4 text-sm items-center">
          <span className="cursor-pointer hover:opacity-80 transition">🌐</span>
          <span className="cursor-pointer hover:opacity-80 transition">👤</span>
        </div>
      </nav>

      {/* ================= HERO VIDEO ================= */}
      <section className="relative w-full h-[92vh] overflow-hidden">
        <video
          src="/video/inora-demo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/40"></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <h2 className="text-5xl font-semibold mb-2">INORA X1</h2>
          <p className="text-lg max-w-2xl leading-relaxed mb-6">
            A next-generation neural communication system designed to decode
            human intent directly from brain signals — empowering individuals
            with ALS and motor neuron disorders to express themselves again.
          </p>

          <div className="flex gap-4">
            <button onClick={() => navigate("/demo")} className="bg-[#3e6ae1] hover:bg-[#3157c8] px-8 py-2 text-sm rounded-sm font-medium transition shadow-sm">
              View More
            </button>
            <button onClick={() => navigate("/about")} className="bg-white text-black hover:bg-gray-100 px-8 py-2 text-sm rounded-sm font-medium transition shadow-sm">
              Explore
            </button>
          </div>
        </div>
      </section>

      {/* ================= MISSION STATEMENT SECTION ================= */}
      <section className="py-20 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-sm bg-blue-50 border border-blue-200 text-[#3e6ae1] text-xs font-semibold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-[#3e6ae1] animate-pulse"></span>
            NEURAL INTELLIGENCE DISCOVERY
          </div>

          <h3 className="text-3xl md:text-4xl font-semibold text-black mb-6 tracking-tight">
            Restoring Human Expression Through Neural Intelligence
          </h3>

          <p className="text-gray-600 text-base md:text-lg leading-relaxed font-normal mb-12">
            INORA exists to bridge the gap between neural intent and spoken
            language. Our mission is to build the world's most reliable,
            explainable, and scalable brain-computer communication system.
          </p>

          {/* Clean Boxy Metric Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-gray-100">
            <div className="p-5 rounded-md bg-[#f9fafb] border border-gray-200 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[#3e6ae1] mb-1">&lt; 50ms</div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Decoding Latency</div>
            </div>

            <div className="p-5 rounded-md bg-[#f9fafb] border border-gray-200 text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">250 Hz</div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Sampling Precision</div>
            </div>

            <div className="p-5 rounded-md bg-[#f9fafb] border border-gray-200 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[#3e6ae1] mb-1">99.4%</div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Intent Accuracy</div>
            </div>

            <div className="p-5 rounded-md bg-[#f9fafb] border border-gray-200 text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">100%</div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Non-Invasive BCI</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2 CARD SECTION ================= */}
      <section className="px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Neural Device */}
          <div className="relative h-[560px] rounded-xl overflow-hidden group border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
            <img
              src="/images/Hardware.png"
              alt="Neural Device Hardware"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Top Text Content Overlay with Clean Light Background */}
            <div className="relative z-10 p-8 bg-white/95 backdrop-blur-md border-b border-gray-200/80">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-[#3e6ae1] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-sm border border-blue-100">
                  CLINICAL BCI HARDWARE
                </span>
                <span className="text-xs font-mono text-gray-400">MODEL X1-EEG</span>
              </div>

              <h3 className="text-3xl font-semibold text-black mb-3">Neural Device</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Our precision-engineered EEG hardware captures high-resolution
                brain signals using optimized amplification, filtering, and
                low-latency transmission. Designed for real-world clinical
                reliability.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => navigate("/demo")}
                  className="bg-[#3e6ae1] hover:bg-[#3157c8] text-white px-6 py-2 rounded-sm text-sm font-medium transition shadow-xs"
                >
                  Order Now
                </button>
                <button 
                  onClick={() => navigate("/about")}
                  className="bg-white hover:bg-gray-50 text-black border border-gray-300 px-6 py-2 rounded-sm text-sm font-medium transition shadow-xs"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Avatar - Jimmi */}
          <div className="relative h-[560px] rounded-xl overflow-hidden group border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
            <img
              src="/images/Avatar.png"
              alt="Avatar Jimmi"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Bottom Text Content Overlay with Clean Light Background */}
            <div className="relative z-10 p-8 bg-white/95 backdrop-blur-md border-t border-gray-200/80 mt-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-sm border border-emerald-100">
                  AI SPEECH SYNTHESIS
                </span>
                <span className="text-xs font-mono text-gray-400">AVATAR v2.4</span>
              </div>

              <h3 className="text-3xl font-semibold text-black mb-3">Avatar- Jimmi</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                A real-time digital avatar powered by LLM-based contextual
                understanding and speech synthesis, translating decoded neural
                signals into natural, human-like communication.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => navigate("/demo")}
                  className="bg-[#3e6ae1] hover:bg-[#3157c8] text-white px-6 py-2 rounded-sm text-sm font-medium transition shadow-xs"
                >
                  Order Now
                </button>
                <button 
                  onClick={() => navigate("/demo")}
                  className="bg-white hover:bg-gray-50 text-black border border-gray-300 px-6 py-2 rounded-sm text-sm font-medium transition shadow-xs"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAP SECTION ================= */}
      <section className="bg-white px-6 md:px-10 py-16 border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-black mb-2">
            The Global Impact of ALS
          </h2>

          <p className="text-gray-600 max-w-3xl mb-8 leading-relaxed text-sm md:text-base">
            Amyotrophic Lateral Sclerosis (ALS) affects hundreds of thousands of
            individuals worldwide. This visualization represents the global
            distribution of patients who could benefit from advanced neural
            communication systems like INORA.
          </p>

          {/* Clean Light Map Frame */}
          <div className="relative w-full aspect-[2/1] min-h-[380px] rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm group">
            <img
              src="/images/World_Map (2).png"
              alt="Global ALS Distribution Map"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-101"
            />

            {/* Glowing Map Hotspots */}
            <div className="absolute top-1/3 left-1/4 flex items-center gap-2 bg-white/95 border border-blue-200 px-3 py-1.5 rounded-sm text-xs text-gray-800 shadow-md">
              <span className="w-2 h-2 rounded-full bg-[#3e6ae1] animate-ping"></span>
              <span className="font-medium">Americas Network</span>
            </div>

            <div className="absolute top-1/4 left-1/2 flex items-center gap-2 bg-white/95 border border-emerald-200 px-3 py-1.5 rounded-sm text-xs text-gray-800 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-medium">European Clinical Hub</span>
            </div>

            <div className="absolute bottom-1/3 right-1/4 flex items-center gap-2 bg-white/95 border border-purple-200 px-3 py-1.5 rounded-sm text-xs text-gray-800 shadow-md">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
              <span className="font-medium">Asia-Pacific Deployment</span>
            </div>

            <button 
              onClick={() => navigate("/about")}
              className="absolute bottom-6 left-6 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 px-5 py-2.5 rounded-sm text-sm font-medium shadow-md transition flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-[#3e6ae1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Find Research Centers
            </button>
          </div>

          {/* Clean Metric Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 rounded-lg bg-[#f9fafb] border border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-3xl font-bold text-black mb-1">200,000+</div>
                <div className="text-sm text-gray-500 font-medium">Estimated Locked-In Syndrome Patients Worldwide</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#3e6ae1] font-bold">
                🧠
              </div>
            </div>

            <div className="p-6 rounded-lg bg-[#f9fafb] border border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-3xl font-bold text-black mb-1">300,000+</div>
                <div className="text-sm text-gray-500 font-medium">Individuals Living With ALS Globally</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                🌐
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL 2 CARD SECTION ================= */}
      <section className="px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Research Program */}
          <div className="relative h-[550px] rounded-xl overflow-hidden group border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
            <img
              src="/images/Future_HeadSet.png"
              alt="Future Headset"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Top Text Content Overlay with Clean Light Background */}
            <div className="relative z-10 p-8 bg-white/95 backdrop-blur-md border-b border-gray-200/80">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-sm border border-indigo-100 inline-block mb-2">
                RESEARCH PROGRAM 2026
              </span>
              <h2 className="text-2xl font-semibold text-black mb-2">
                Next-Generation Neural Hardware
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                We are developing lighter, more adaptive EEG hardware with
                improved signal-to-noise ratios and real-time calibration,
                enabling accurate intent decoding even in complex neurological
                conditions.
              </p>

              <button 
                onClick={() => navigate("/about")}
                className="bg-[#3e6ae1] hover:bg-[#3157c8] text-white px-6 py-2 rounded-sm text-sm font-medium transition shadow-xs"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Card 2: Core AI */}
          <div className="relative h-[550px] rounded-xl overflow-hidden group border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
            <img
              src="/images/LLM.png"
              alt="LLM Core AI"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Bottom Text Content Overlay with Clean Light Background */}
            <div className="relative z-10 p-8 bg-white/95 backdrop-blur-md border-t border-gray-200/80 mt-auto">
              <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-sm border border-purple-100 inline-block mb-2">
                INORA CORE AI
              </span>
              <h2 className="text-2xl font-semibold text-black mb-2">
                LLM-Powered Neural Language Understanding
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                By integrating large language models with neural decoding
                pipelines, INORA interprets intent within contextual vocabulary
                spaces — transforming raw brain signals into meaningful,
                structured communication.
              </p>

              <button 
                onClick={() => navigate("/demo")}
                className="bg-[#3e6ae1] hover:bg-[#3157c8] text-white px-6 py-2 rounded-sm text-sm font-medium transition shadow-xs"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-[#f5f5f5] border-t border-gray-200 mt-16">
        {/* Disclaimer Text */}
        <div className="max-w-6xl mx-auto px-6 py-6 text-[11px] text-gray-500 leading-relaxed">
          <p className="mb-2">
            ¹ Price reflects monthly subscription, subject to terms and
            conditions. Price and feature availability subject to change.
          </p>

          <p>
            ² Price listed does not include Destination and Order Fees, taxes
            and other fees. Subject to change. Starting price including the
            Destination and Order fees, but excluding taxes and other fees.
          </p>
        </div>

        {/* Footer Links */}
        <div className="border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap justify-center gap-6 text-[12px] text-gray-600 font-medium">
            <span className="cursor-pointer hover:text-black transition">
              INORA © 2026
            </span>

            <span onClick={() => navigate("/about")} className="cursor-pointer hover:text-black transition">
              Privacy & Legal
            </span>

            <span onClick={() => navigate("/about")} className="cursor-pointer hover:text-black transition">
              Research Compliance
            </span>

            <span onClick={() => navigate("/about")} className="cursor-pointer hover:text-black transition">
              Contact
            </span>

            <span onClick={() => navigate("/about")} className="cursor-pointer hover:text-black transition">
              News
            </span>

            <span onClick={() => navigate("/demo")} className="cursor-pointer hover:text-black transition">
              Get Updates
            </span>

            <span onClick={() => navigate("/about")} className="cursor-pointer hover:text-black transition">
              Locations
            </span>

            <span onClick={() => navigate("/about")} className="cursor-pointer hover:text-black transition">
              Learn
            </span>
          </div>
        </div>
      </footer>

      {/* ================= TESLA EXACT STYLE STICKY BAR ================= */}
      <div className="fixed bottom-0 left-0 w-full bg-[#f4f4f4] border-t border-gray-300 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex justify-center gap-4">
          {/* Ask a Question */}
          <button 
            onClick={() => setShowAskModal(true)}
            className="flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 transition px-6 py-2 rounded-md text-[14px] font-medium text-gray-800 shadow-xs"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4-4 7-9 7-1.4 0-2.7-.2-3.9-.6L3 20l1.6-4C3.6 14.9 3 13.5 3 12c0-4 4-7 9-7s9 3 9 7z"
                />
              </svg>
            </span>
            Ask a Question
            <span className="ml-3 w-6 h-6 flex items-center justify-center rounded-md bg-gray-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </span>
          </button>

          {/* Launch Demo Button */}
          <button 
            onClick={() => navigate("/demo")} 
            className="flex items-center gap-3 bg-[#3e6ae1] hover:bg-[#3157c8] transition px-6 py-2 rounded-md text-[14px] font-medium text-white shadow-xs"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 12v6M12 12l6-3M12 12l-6-3"
                />
              </svg>
            </span>
            Launch Demo
          </button>
        </div>
      </div>

      {/* ================= ASK QUESTION MODAL ================= */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl p-6 shadow-2xl text-black">
            <button 
              onClick={() => setShowAskModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black transition font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#3e6ae1]">
                💬
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black">Ask INORA Assistant</h3>
                <p className="text-xs text-gray-500">Query the Neural Engine or ask about BCI hardware</p>
              </div>
            </div>

            <form onSubmit={handleQuestionSubmit} className="space-y-4">
              <div>
                <textarea
                  rows="3"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Type your question here (e.g. How does INORA decode intent from EEG?)..."
                  className="w-full bg-[#f9fafb] border border-gray-300 rounded-md p-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#3e6ae1] transition"
                ></textarea>
              </div>

              {modalResponse && (
                <div className="p-3.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-[#3e6ae1] leading-relaxed">
                  {modalResponse}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 rounded-sm text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isAsking}
                  className="px-5 py-2 rounded-sm text-xs font-medium bg-[#3e6ae1] hover:bg-[#3157c8] text-white transition flex items-center gap-2"
                >
                  {isAsking ? "Processing..." : "Submit Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}