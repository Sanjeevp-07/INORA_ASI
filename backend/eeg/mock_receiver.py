# backend/eeg/mock_receiver.py
# ============================================================
# MOCK HARDWARE — SHARE FREELY WITH TEAM
# Simulates EEG data at 250Hz, 3 channels.
# Cycles through intent-specific brainwave patterns so the
# classifier naturally predicts different intents.
# ============================================================

import threading
import time
import math
import random
from utils.logger import get_logger
from config import SAMPLING_RATE, CHANNELS
from eeg.base_receiver import BaseEEGReceiver


logger = get_logger("EEG-Mock-Receiver")


# ── Intent → dominant brainwave profile ──────────────────────────────────────
#
#  The FeatureExtractor computes band powers for:
#    delta(1–4Hz), theta(4–8Hz), alpha(8–13Hz), beta(13–30Hz), gamma(30–40Hz)
#  across 3 channels (15 features total).
#
#  We craft each intent's signal so its dominant band stands out clearly,
#  giving the RandomForest classifier a strong, distinct feature vector.
#
#  Profile dict keys:
#    delta / theta / alpha / beta / gamma  → amplitude in µV
#    noise                                 → gaussian noise std in µV
# ─────────────────────────────────────────────────────────────────────────────
INTENT_PROFILES = {
    "YES": {
        # YES → strong beta (focused, decisive)
        "delta": 5.0,
        "theta": 8.0,
        "alpha": 15.0,
        "beta":  65.0,   # dominant
        "gamma": 10.0,
        "noise": 4.0,
    },
    "NO": {
        # NO → strong alpha (relaxed, rejecting)
        "delta": 5.0,
        "theta": 10.0,
        "alpha": 70.0,   # dominant
        "beta":  12.0,
        "gamma": 5.0,
        "noise": 4.0,
    },
    "HELP": {
        # HELP → strong theta + delta (distress, slow waves)
        "delta": 55.0,   # dominant
        "theta": 45.0,   # dominant
        "alpha": 10.0,
        "beta":  8.0,
        "gamma": 4.0,
        "noise": 6.0,
    },
    "PAIN": {
        # PAIN → strong gamma + delta (arousal + distress)
        "delta": 40.0,   # dominant
        "theta": 10.0,
        "alpha": 8.0,
        "beta":  20.0,
        "gamma": 55.0,   # dominant
        "noise": 8.0,
    },
    "IDLE": {
        # IDLE → balanced low-amplitude (resting state)
        "delta": 10.0,
        "theta": 12.0,
        "alpha": 30.0,   # slightly dominant (eyes-closed rest)
        "beta":  10.0,
        "gamma": 5.0,
        "noise": 3.0,
    },
}

# How many seconds each intent pattern is held before cycling to the next
INTENT_CYCLE_SECONDS = 15

# Order in which intents cycle
INTENT_CYCLE_ORDER = ["YES", "NO", "HELP", "PAIN", "IDLE"]


class MockEEGReceiver(BaseEEGReceiver):
    """
    Simulates EEG data from ESP32 over Serial.

    Generates 3-channel EEG-like signals at 250 Hz.
    Cycles through intent-specific brainwave profiles every
    INTENT_CYCLE_SECONDS seconds so the classifier sees variety.

    Buffer receives identical format to real hardware:
      buffer.add_sample(timestamp_sec, [ch1, ch2, ch3])
    """

    def __init__(self, port: str, baudrate: int, buffer):
        super().__init__(port, baudrate, buffer)
        self._thread = None
        self._start_time = None
        self._current_intent = INTENT_CYCLE_ORDER[0]

    def start(self):
        logger.info(f"[MOCK] Starting mock EEG receiver (port={self.port} ignored)")
        logger.info(f"[MOCK] Simulating {CHANNELS} channels at {SAMPLING_RATE} Hz")
        logger.info(f"[MOCK] Intent cycle: {INTENT_CYCLE_ORDER} ({INTENT_CYCLE_SECONDS}s each)")

        self._start_time = time.time()
        self.running = True

        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

        logger.info("[MOCK] Mock EEG Receiver Started ✅")

    def _get_current_profile(self) -> dict:
        """
        Returns the intent profile based on elapsed time,
        cycling through INTENT_CYCLE_ORDER.
        """
        elapsed = time.time() - self._start_time
        cycle_index = int(elapsed / INTENT_CYCLE_SECONDS) % len(INTENT_CYCLE_ORDER)
        intent = INTENT_CYCLE_ORDER[cycle_index]

        if intent != self._current_intent:
            self._current_intent = intent
            logger.info(f"[MOCK] 🔄 Switching to intent pattern: {intent}")

        return INTENT_PROFILES[intent]

    def _read_loop(self):
        """
        Pushes one sample every 1/SAMPLING_RATE seconds.
        Each sample uses the current intent's brainwave profile.
        """
        interval = 1.0 / SAMPLING_RATE  # ~0.004 sec at 250Hz
        sample_index = 0

        while self.running:
            loop_start = time.time()

            try:
                timestamp_sec = time.time() - self._start_time
                profile = self._get_current_profile()

                # Phase offsets keep channels realistically different
                ch1 = self._generate_eeg_sample(sample_index, profile, phase_offset=0.0)
                ch2 = self._generate_eeg_sample(sample_index, profile, phase_offset=0.3)
                ch3 = self._generate_eeg_sample(sample_index, profile, phase_offset=0.6)

                self.buffer.add_sample(
                    timestamp=timestamp_sec,
                    channels=[ch1, ch2, ch3]
                )

                sample_index += 1

            except Exception as e:
                logger.error(f"[MOCK] Sample generation error: {e}")
                time.sleep(0.1)

            elapsed = time.time() - loop_start
            sleep_time = interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

    def _generate_eeg_sample(
        self,
        index: int,
        profile: dict,
        phase_offset: float = 0.0
    ) -> float:
        """
        Generates a single EEG-like sample using the given intent profile.

        Each band is represented by a sine wave at its centre frequency,
        scaled by the profile amplitude. This directly shapes the PSD that
        FeatureExtractor.bandpower() will measure.

        Band centre frequencies used:
          delta → 2 Hz   (1–4 Hz band)
          theta → 6 Hz   (4–8 Hz band)
          alpha → 10 Hz  (8–13 Hz band)
          beta  → 20 Hz  (13–30 Hz band)
          gamma → 35 Hz  (30–40 Hz band)

        Args:
            index        : sample number (time axis)
            profile      : intent profile dict with band amplitudes
            phase_offset : radians offset to differentiate channels

        Returns:
            float : simulated microvolt reading
        """
        t = index / SAMPLING_RATE

        def wave(freq, amp):
            return amp * math.sin(2 * math.pi * freq * t + phase_offset)

        delta = wave(2,  profile["delta"])
        theta = wave(6,  profile["theta"])
        alpha = wave(10, profile["alpha"])
        beta  = wave(20, profile["beta"])
        gamma = wave(35, profile["gamma"])
        noise = random.gauss(0, profile["noise"])

        return round(delta + theta + alpha + beta + gamma + noise, 4)

    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=2)
        logger.info("[MOCK] Mock EEG Receiver Stopped")
