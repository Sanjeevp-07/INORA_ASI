# backend/config.py

from pathlib import Path
import os


BASE_DIR = Path(__file__).resolve().parent


# ==============================
# EEG Configuration
# ==============================
SAMPLING_RATE = 250  # Hz
CHANNELS = 3  # <-- You have 3 EEG channels

WINDOW_SIZE_SECONDS = 2
WINDOW_SIZE_SAMPLES = SAMPLING_RATE * WINDOW_SIZE_SECONDS

OVERLAP_PERCENT = 0.5
STEP_SIZE = int(WINDOW_SIZE_SAMPLES * (1 - OVERLAP_PERCENT))


# ==============================
# Model Configuration
# ==============================
MODEL_PATH = BASE_DIR / "eeg_model.pkl"
SCALER_PATH = BASE_DIR / "scaler.pkl"

CLASS_LABELS = ["YES", "NO", "HELP", "WATER"]


# ==============================
# WebSocket
# ==============================
WS_ROUTE = "/ws"


# ==============================
# Logging
# ==============================
LOG_LEVEL = "INFO"


# ==============================
# Feature Extraction
# ==============================
USE_BANDPOWER = True
USE_STATISTICAL_FEATURES = True


# ==============================
# Future Flags
# ==============================
ENABLE_DATABASE = False
ENABLE_SPEECH = False
ENABLE_AVATAR = True


# ==============================
# Hardware Mode
# Set env var MOCK_EEG=1 for development/testing.
# Production always uses real hardware (default).
# ==============================
USE_MOCK_HARDWARE = os.getenv("MOCK_EEG", "1") == "1"