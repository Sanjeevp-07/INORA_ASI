# backend/eeg/filtering.py

import math
import numpy as np
from scipy.signal import butter, filtfilt, iirnotch
from config import SAMPLING_RATE


class EEGFilter:
    """Batch zero-phase bandpass + notch filter used for classification."""

    def __init__(self):
        self.fs = SAMPLING_RATE

        # Bandpass: 1–40 Hz
        self.b_bp, self.a_bp = butter(
            N=4,
            Wn=[1 / (self.fs / 2), 40 / (self.fs / 2)],
            btype="band"
        )

        # Notch filter at 50 Hz (India power frequency)
        self.b_notch, self.a_notch = iirnotch(
            w0=50,
            Q=30,
            fs=self.fs
        )

    def apply(self, eeg_data: np.ndarray) -> np.ndarray:
        """
        eeg_data shape: (samples, channels)
        """

        filtered = np.zeros_like(eeg_data)

        for ch in range(eeg_data.shape[1]):
            signal = eeg_data[:, ch]

            # Bandpass
            signal = filtfilt(self.b_bp, self.a_bp, signal)

            # Notch
            signal = filtfilt(self.b_notch, self.a_notch, signal)

            filtered[:, ch] = signal

        return filtered


class OnlineEEGFilter:
    """
    Real-time sample-by-sample IIR bandpass filter for streaming.

    Cascade of two first-order IIR stages:
      Stage 1 — HP at 0.5 Hz : removes DC baseline and sub-Hz drift
      Stage 2 — LP at 40 Hz  : removes 50 Hz power-line and HF muscle noise

    Maintains state across samples — call process() once per incoming sample.
    """

    def __init__(self, fs: int = SAMPLING_RATE, n_channels: int = 3):
        # HP: alpha = exp(-2π · fc / fs)
        self._hp_a  = math.exp(-2.0 * math.pi * 0.5 / fs)
        # LP: alpha = 1 - exp(-2π · fc / fs)
        self._lp_a  = 1.0 - math.exp(-2.0 * math.pi * 40.0 / fs)

        # Per-channel state: [prev_raw_x, prev_hp_y, prev_lp_y]
        self._state = [[0.0, 0.0, 0.0] for _ in range(n_channels)]

    def process(self, channels: list) -> list:
        """
        Filter one sample across all channels.

        Args:
            channels : list[float]  raw ADC / serial values, one per channel
        Returns:
            list[float]  bandpass-filtered values in the same unit
        """
        out = []
        for i, x in enumerate(channels):
            if i >= len(self._state):
                out.append(float(x))
                continue

            prev_x, prev_hp, prev_lp = self._state[i]

            # Stage 1 — first-order IIR high-pass
            hp = self._hp_a * (prev_hp + x - prev_x)

            # Stage 2 — first-order IIR low-pass
            lp = self._lp_a * hp + (1.0 - self._lp_a) * prev_lp

            self._state[i] = [x, hp, lp]
            out.append(round(lp, 4))

        return out

    def reset(self):
        """Reset all channel states (call on reconnect)."""
        for s in self._state:
            s[0] = s[1] = s[2] = 0.0