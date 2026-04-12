# backend/eeg/features.py

import numpy as np
from scipy.signal import welch
from config import SAMPLING_RATE


class FeatureExtractor:

    def __init__(self):
        self.fs = SAMPLING_RATE

    def bandpower(self, data, fmin, fmax):
        freqs, psd = welch(data, fs=self.fs, nperseg=256)
        idx = np.logical_and(freqs >= fmin, freqs <= fmax)
        return np.trapz(psd[idx], freqs[idx])

    def extract(self, eeg_data: np.ndarray):
        """
        eeg_data shape: (samples, channels)
        returns feature vector of size 27 (for 3 channels)
        """

        features = []

        for ch in range(eeg_data.shape[1]):

            signal = eeg_data[:, ch]

            # Normalize (same as Colab)
            signal = (signal - np.mean(signal)) / (np.std(signal) + 1e-8)



            # Band Powers ONLY (match Colab exactly)
            delta = self.bandpower(signal, 1, 4)
            theta = self.bandpower(signal, 4, 8)
            alpha = self.bandpower(signal, 8, 13)
            beta = self.bandpower(signal, 13, 30)
            gamma = self.bandpower(signal, 30, 40)



            # ======================
            # Statistical Features
            # ======================
            mean = np.mean(signal)
            std = np.std(signal)
            var = np.var(signal)
            energy = np.sum(signal ** 2)

            features.extend([
                delta,
                theta,
                alpha,
                beta,
                gamma
                
            ])

        return np.array(features).reshape(1, -1)