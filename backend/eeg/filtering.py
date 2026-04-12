# backend/eeg/filtering.py

import numpy as np
from scipy.signal import butter, filtfilt, iirnotch
from config import SAMPLING_RATE


class EEGFilter:

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