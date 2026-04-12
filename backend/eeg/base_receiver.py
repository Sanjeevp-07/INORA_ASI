# backend/eeg/base_receiver.py
# ============================================================
# CONTRACT FILE — SHARE FREELY WITH TEAM
# This defines the interface all EEG receivers must follow.
# Do NOT modify without discussing with hardware owner.
# ============================================================

from abc import ABC, abstractmethod


class BaseEEGReceiver(ABC):
    """
    Abstract base class for all EEG receivers.
    
    Your EEGBuffer receives data via: buffer.add_sample(timestamp, channels)
    where:
        timestamp : float  → time in seconds
        channels  : list   → [ch1, ch2, ch3] float values
    
    Team members should ONLY interact with this interface.
    """

    def __init__(self, port: str, baudrate: int, buffer):
        """
        Args:
            port     : str   → Hardware port (e.g. "COM9") or mock identifier
            baudrate : int   → Serial baud rate (e.g. 115200) or ignored in mock
            buffer   : EEGBuffer → Shared buffer that stores incoming EEG samples
        """
        self.port = port
        self.baudrate = baudrate
        self.buffer = buffer
        self.running = False

    @abstractmethod
    def start(self):
        """
        Start the receiver. 
        Must begin pushing samples into self.buffer via:
            self.buffer.add_sample(timestamp_sec, [ch1, ch2, ch3])
        """
        pass

    @abstractmethod
    def stop(self):
        """
        Stop the receiver and release any resources.
        """
        pass