# backend/eeg/buffer.py

import numpy as np
from collections import deque
from config import WINDOW_SIZE_SAMPLES, STEP_SIZE, CHANNELS


class EEGBuffer:
    """
    Timestamp-aware EEG buffer with sliding window support.
    """

    def __init__(self):
        self.buffer = deque(maxlen=WINDOW_SIZE_SAMPLES * 5)
        # maxlen prevents infinite memory growth

    def add_sample(self, timestamp: float, channels: list):

        if len(channels) != CHANNELS:
            return  # silently ignore wrong packets

        self.buffer.append([timestamp] + channels)

    def is_ready(self) -> bool:
        return len(self.buffer) >= WINDOW_SIZE_SAMPLES

    def get_window(self):

        if not self.is_ready():
            return None, None

        # Convert only needed part to numpy
        window_data = list(self.buffer)[:WINDOW_SIZE_SAMPLES]
        window = np.array(window_data)

        timestamps = window[:, 0]
        eeg_data = window[:, 1:]

        # Slide buffer safely
        remove_count = min(STEP_SIZE, len(self.buffer))
        for _ in range(remove_count):
            self.buffer.popleft()

        return timestamps, eeg_data