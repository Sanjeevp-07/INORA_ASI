import React from "react";

import { useNavigate } from "react-router-dom";

export default function Home() {
   const navigate = useNavigate();

  return (
    <div className="bg-[#f5f5f5] font-sans text-black pb-16">
      {/* ================= NAVBAR ================= */}
      <nav className="w-full flex justify-between items-center px-10 py-4 bg-white">
        <h1 className="text-2xl tracking-[6px] font-semibold">INORA</h1>

        <div className="hidden md:flex gap-8 text-sm font-medium">
          <span className="cursor-pointer">Brain</span>
          <span className="cursor-pointer">Interface</span>
          <span className="cursor-pointer">Technology</span>
          <span className="cursor-pointer">Research</span>
          <span className="cursor-pointer">Shop</span>
        </div>

        <div className="flex gap-4 text-sm">
          <span>🌐</span>
          <span>👤</span>
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

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center">
          <h2 className="text-5xl font-semibold mb-2">INORA X1</h2>
          <p className="text-lg max-w-2xl leading-relaxed mb-6">
            A next-generation neural communication system designed to decode
            human intent directly from brain signals — empowering individuals
            with ALS and motor neuron disorders to express themselves again.
          </p>

          <div className="flex gap-4">
            <button className="bg-[#3e6ae1] px-8 py-2 text-sm rounded-sm">
            View More
            </button>
            <button  onClick={() =>navigate("/about")} className="bg-white text-black px-8 py-2 text-sm rounded-sm">
              Explore
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-3xl font-semibold mb-6">
            Restoring Human Expression Through Neural Intelligence
          </h3>

          <p className="text-gray-600 leading-relaxed">
            INORA exists to bridge the gap between neural intent and spoken
            language. Our mission is to build the world's most reliable,
            explainable, and scalable brain-computer communication system.
          </p>
        </div>
      </section>

      {/* ================= 2 CARD SECTION ================= */}
      <section className="px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="relative h-[550px] rounded-xl overflow-hidden group">
            <img
              src="/images/Hardware.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute top-8 left-8 text-black">
              <h3 className="text-3xl font-semibold mb-3">Neural Device</h3>
              <p className="text-sm max-w-md leading-relaxed mt-3">
                Our precision-engineered EEG hardware captures high-resolution
                brain signals using optimized amplification, filtering, and
                low-latency transmission. Designed for real-world clinical
                reliability.
              </p>
              <div className="flex gap-4">
                <button className="bg-[#3e6ae1] px-6 py-2 text-sm rounded-sm">
                  Order Now
                </button>
                <button className="bg-white text-black px-6 py-2 text-sm rounded-sm">
                  Learn More
                </button>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="relative h-[550px] rounded-xl overflow-hidden group">
            <img
              src="/images/Avatar.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute bottom-8 left-8 text-black">
              <h3 className="text-3xl font-semibold mb-3">Avatar- Jimmi</h3>
              <p className="text-sm max-w-md leading-relaxed mt-3">
                A real-time digital avatar powered by LLM-based contextual
                understanding and speech synthesis, translating decoded neural
                signals into natural, human-like communication.
              </p>
              <div className="flex gap-4">
                <button className="bg-[#3e6ae1] px-6 py-2 text-sm rounded-sm">
                  Order Now
                </button>
                <button className="bg-white text-black px-6 py-2 text-sm rounded-sm">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAP SECTION ================= */}
      <section className="bg-white px-10 py-16">
        <h2 className="text-3xl font-semibold mb-2">
          The Global Impact of ALS
        </h2>

        <p className="text-gray-500 mb-8">
          Amyotrophic Lateral Sclerosis (ALS) affects hundreds of thousands of
          individuals worldwide. This visualization represents the global
          distribution of patients who could benefit from advanced neural
          communication systems like INORA.
        </p>

        <div className="elative w-full aspect-[2/1] rounded-xl overflow-hidden">
          <img
            src="/images/World_Map (2).png"
            alt="Map"
            className="w-full h-full object-cover"
          />

          <button className="absolute bottom-6 left-6 bg-white px-4 py-2 text-sm rounded shadow">
            Find Me
          </button>
        </div>

        <div className="flex justify-end gap-16 mt-8 text-xl font-semibold">
          <div>
            200,000+
            <span className="text-gray-500 text-base block">
              Estimated Locked-In Syndrome Patients Worldwide
            </span>
          </div>

          <div>
            300,000+
            <span className="text-gray-500 text-base block">
              Individuals Living With ALS Globally
            </span>
          </div>
        </div>
      </section>

      {/* ================= FINAL 2 CARD SECTION ================= */}
      <section className="px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative h-[550px] rounded-xl overflow-hidden group">
            <h2 className="text-3xl font-semibold mb-2">
              Next-Generation Neural Hardware
            </h2>

            <p className="text-sm max-w-md leading-relaxed mt-3">
              We are developing lighter, more adaptive EEG hardware with
              improved signal-to-noise ratios and real-time calibration,
              enabling accurate intent decoding even in complex neurological
              conditions.
            </p>
            <img
              src="/images/Future_HeadSet.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute bottom-8 left-8 text-white">
              <h3 className="text-3xl font-semibold mb-3">Research Program</h3>
              <button className="bg-[#3e6ae1] px-6 py-2 text-sm rounded-sm">
                Learn More
              </button>
            </div>
          </div>

          <div className="relative h-[550px] rounded-xl overflow-hidden group">
            <h2 className="text-3xl font-semibold mb-2">
              LLM-Powered Neural Language Understanding
            </h2>

            <p className="text-sm max-w-md leading-relaxed mt-3">
              By integrating large language models with neural decoding
              pipelines, INORA interprets intent within contextual vocabulary
              spaces — transforming raw brain signals into meaningful,
              structured communication.
            </p>
            <img
              src="/images/LLM.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute bottom-8 left-8 text-white">
              <h3 className="text-3xl font-semibold mb-3">INORA Core AI</h3>
              <button className="bg-[#3e6ae1] px-6 py-2 text-sm rounded-sm">
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
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap justify-center gap-6 text-[12px] text-gray-600">
            <span className="cursor-pointer hover:text-black transition">
              INORA © 2026
            </span>

            <span className="cursor-pointer hover:text-black transition">
              Privacy & Legal
            </span>

            <span className="cursor-pointer hover:text-black transition">
              Research Compliance
            </span>

            <span className="cursor-pointer hover:text-black transition">
              Contact
            </span>

            <span className="cursor-pointer hover:text-black transition">
              News
            </span>

            <span className="cursor-pointer hover:text-black transition">
              Get Updates
            </span>

            <span className="cursor-pointer hover:text-black transition">
              Locations
            </span>

            <span className="cursor-pointer hover:text-black transition">
              Learn
            </span>
          </div>
        </div>
      </footer>

      {/* ================= TESLA EXACT STYLE STICKY BAR ================= */}
      <div className="fixed bottom-0 left-0 w-full bg-[#f4f4f4] border-t border-gray-300 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex justify-center gap-4">
          {/* Ask a Question */}
          <button className="flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 transition px-6 py-2 rounded-md text-[14px] font-medium text-gray-800 shadow-sm">
            {/* Chat Icon */}
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
            {/* Arrow Icon */}
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

          {/* Schedule Button */}
          <button onClick={() => navigate("/demo")} className="flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 transition px-6 py-2 rounded-md text-[14px] font-medium text-gray-800 shadow-sm">
            {/* Steering Wheel Icon */}
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" r="9" />
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
    </div>
  );
}