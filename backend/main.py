# backend/main.py

from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import threading
import time
import asyncio
import shutil
import os
from collections import deque

from eeg.buffer import EEGBuffer
from eeg.classifier import EEGClassifier
from eeg.filtering import EEGFilter
from eeg.features import FeatureExtractor

from speech.stt import SpeechToText
from speech.tts import TextToSpeech
from context.rule_engine import RuleEngine

from websocket.ws_manager import ConnectionManager, EEGStreamManager
from utils.logger import get_logger
from config import WS_ROUTE, USE_MOCK_HARDWARE

# ─────────────────────────────────────────
# App setup
# ─────────────────────────────────────────

app    = FastAPI()
logger = get_logger("INORA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# Core components
# ─────────────────────────────────────────

buffer            = EEGBuffer()
classifier        = EEGClassifier()
eeg_filter        = EEGFilter()
feature_extractor = FeatureExtractor()

stt         = SpeechToText(model_size="base")
tts         = TextToSpeech()
rule_engine = RuleEngine()
manager     = ConnectionManager()

if USE_MOCK_HARDWARE:
    from eeg.mock_receiver import MockEEGReceiver
    receiver = MockEEGReceiver(port="MOCK", baudrate=115200, buffer=buffer)
else:
    from eeg.receiver import EEGReceiver
    receiver = EEGReceiver(port="COM9", baudrate=115200, buffer=buffer)

# ─────────────────────────────────────────
# Global state
# ─────────────────────────────────────────

latest_question       = None
question_active       = False
intent_collection     = []
collection_start_time = None
collection_started    = False

DECISION_DELAY    = 2
COLLECTION_WINDOW = 5

latest_intent     = "IDLE"
latest_confidence = 0.0

# ─────────────────────────────────────────
# EEG real-time sample queue
# maxlen=2500 = 10s of data — old samples auto-drop
# ─────────────────────────────────────────

eeg_sample_queue: deque = deque(maxlen=2500)


# ─────────────────────────────────────────
# EEG STREAMING LOOP — runs at 30fps
# Sends batches of raw EEG samples to frontend
# ─────────────────────────────────────────

def eeg_stream_loop():
    logger.info("📡 EEG Stream Loop Started (30fps)")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    STREAM_FPS = 30
    FRAME_MS   = 1.0 / STREAM_FPS

    while True:
        try:
            frame_start = time.time()

            if manager.active_connections and eeg_sample_queue:
                batch = []
                while eeg_sample_queue:
                    batch.append(eeg_sample_queue.popleft())

                if batch:
                    payload = {
                        "type":        "eeg_stream",
                        "samples":     batch,
                        "live_intent": latest_intent,
                        "confidence":  round(float(latest_confidence), 4),
                    }
                    try:
                        loop.run_until_complete(manager.broadcast(payload))
                    except Exception:
                        pass

            elapsed = time.time() - frame_start
            sleep_t = max(0, FRAME_MS - elapsed)
            time.sleep(sleep_t)

        except Exception as e:
            logger.error(f"EEG stream loop error: {e}")
            time.sleep(0.1)


# ─────────────────────────────────────────
# Brain Processing Loop — classification only
# ─────────────────────────────────────────

def processing_loop():
    logger.info("🧠 Processing Loop Started")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    global latest_question, question_active
    global intent_collection, collection_start_time, collection_started
    global latest_intent, latest_confidence

    while True:
        try:
            current_time = time.time()

            # ── QUESTION MODE ──────────────────────────────
            if question_active:

                if not collection_started:
                    if current_time - collection_start_time >= DECISION_DELAY:
                        collection_started    = True
                        intent_collection     = []
                        collection_start_time = current_time
                        logger.info("🟢 EEG collection started (5s window)")

                else:
                    if current_time - collection_start_time >= COLLECTION_WINDOW:

                        final_intent = (
                            max(set(intent_collection), key=intent_collection.count)
                            if intent_collection else "UNKNOWN"
                        )
                        logger.info(f"✅ Final Intent: {final_intent}")

                        sentence = rule_engine.generate_sentence(final_intent, latest_question)
                        logger.info(f"✅ Response: {sentence}")

                        _sentence = sentence
                        _intent   = final_intent
                        _question = latest_question

                        loop.run_until_complete(
                            manager.broadcast({
                                "type":      "response",
                                "intent":    _intent,
                                "sentence":  _sentence,
                                "question":  _question,
                                "audio_url": None,
                            })
                        )
                        logger.info("✅ Initial broadcast sent (no audio yet)")

                        def run_tts_and_notify(_sentence=_sentence, _intent=_intent, _question=_question):
                            try:
                                path = tts.generate_audio(_sentence)
                                if path:
                                    filename  = os.path.basename(path)
                                    audio_url = f"http://localhost:8000/audio/{filename}"
                                    logger.info(f"✅ TTS ready: {audio_url}")
                                    asyncio.run(
                                        manager.broadcast({
                                            "type":      "response",
                                            "intent":    _intent,
                                            "sentence":  _sentence,
                                            "question":  _question,
                                            "audio_url": audio_url,
                                        })
                                    )
                                    logger.info("✅ Audio broadcast sent")
                                else:
                                    logger.warning("⚠️ TTS returned no path")
                            except Exception as e:
                                logger.error(f"TTS thread error: {e}")

                        threading.Thread(target=run_tts_and_notify, daemon=True).start()

                        question_active       = False
                        intent_collection     = []
                        collection_start_time = None
                        collection_started    = False
                        latest_question       = None
                        logger.info("🟢 Response mode deactivated")

            # ── EEG CLASSIFICATION ─────────────────────────
            if buffer.is_ready():
                timestamps, eeg_data = buffer.get_window()

                if eeg_data is not None:
                    filtered_data = eeg_filter.apply(eeg_data)
                    features      = feature_extractor.extract(filtered_data)
                    result        = classifier.predict(features)

                    latest_intent     = result["prediction"].upper()
                    latest_confidence = result["confidence"]

                    if question_active and collection_started:
                        intent_collection.append(latest_intent)

        except Exception as e:
            logger.error(f"🔥 PROCESSING LOOP CRASHED: {e}")

        time.sleep(0.01)


# ─────────────────────────────────────────
# Lifecycle
# ─────────────────────────────────────────

@app.on_event("startup")
def startup_event():
    logger.info("🚀 Starting INORA Backend")
    receiver.start()
    _patch_buffer_add_sample()
    threading.Thread(target=processing_loop,    daemon=True).start()
    threading.Thread(target=eeg_stream_loop,    daemon=True).start()
    threading.Thread(target=eeg_stream_loop_v2, daemon=True).start()


@app.get("/")
def health_check():
    return {"status": "INORA Backend Running"}


# ─────────────────────────────────────────
# Audio file serving
# ─────────────────────────────────────────

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    for folder in ["generated_audio", "."]:
        path = os.path.join(folder, filename)
        if os.path.exists(path):
            return FileResponse(path, media_type="audio/wav")
    return {"error": "File not found"}


# ─────────────────────────────────────────
# WebSocket — main /ws route
# ─────────────────────────────────────────

@app.websocket(WS_ROUTE)
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)


# ─────────────────────────────────────────
# Voice question endpoint — FIXED
# ─────────────────────────────────────────

@app.post("/ask")
async def ask_question(file: UploadFile = File(...)):
    global latest_question, question_active
    global intent_collection, collection_start_time, collection_started

    # Preserve real extension so faster-whisper reads codec correctly
    original_name = file.filename or "question.webm"
    ext           = os.path.splitext(original_name)[-1] or ".webm"
    temp_path     = f"temp_audio{ext}"

    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    text = stt.transcribe_file(temp_path)

    # Clean up temp file after transcription
    try:
        os.remove(temp_path)
    except Exception:
        pass

    if not text:
        logger.warning("⚠️ Empty transcription received")
        return {"question": ""}

    latest_question       = text
    question_active       = True
    intent_collection     = []
    collection_start_time = time.time()
    collection_started    = False

    logger.info(f"✅ Question received: {text}")
    logger.info("🟡 Decision phase started (2s delay before EEG collection)")

    # Broadcast question to frontend so UI can display it live
    asyncio.create_task(
        manager.broadcast({
            "type":     "question_received",
            "question": text,
        })
    )

    return {"question": text}


# ─────────────────────────────────────────
# /ws/eeg — dedicated real-time EEG stream
# ─────────────────────────────────────────

eeg_stream_manager = EEGStreamManager()


@app.websocket("/ws/eeg")
async def eeg_websocket_endpoint(websocket: WebSocket):
    await eeg_stream_manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except Exception:
        eeg_stream_manager.disconnect(websocket)


# ─────────────────────────────────────────
# EEG stream loop v2 — drains queue → /ws/eeg
# ─────────────────────────────────────────

def eeg_stream_loop_v2():
    logger.info("📡 EEG Stream v2 Started → /ws/eeg (30fps, zero-drop)")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    FRAME_SEC = 1.0 / 30

    while True:
        try:
            frame_start = time.time()

            if eeg_stream_manager.connections and eeg_sample_queue:
                batch = []
                while eeg_sample_queue:
                    batch.append(eeg_sample_queue.popleft())

                if batch:
                    payload = {
                        "type":        "eeg_stream",
                        "samples":     batch,
                        "live_intent": latest_intent,
                        "confidence":  round(float(latest_confidence), 4),
                    }
                    try:
                        loop.run_until_complete(eeg_stream_manager.broadcast(payload))
                    except Exception:
                        pass

            elapsed = time.time() - frame_start
            sleep_t = max(0, FRAME_SEC - elapsed)
            time.sleep(sleep_t)

        except Exception as e:
            logger.error(f"EEG stream v2 error: {e}")
            time.sleep(0.1)


# ─────────────────────────────────────────
# Patch buffer.add_sample → also push to queue
# ─────────────────────────────────────────

def _patch_buffer_add_sample():
    original_add_sample = buffer.add_sample

    def patched_add_sample(timestamp, channels):
        original_add_sample(timestamp, channels)

        try:
            eeg_sample_queue.append({
                "ch1": float(channels[0]) if len(channels) > 0 else 0.0,
                "ch2": float(channels[1]) if len(channels) > 1 else 0.0,
                "ch3": float(channels[2]) if len(channels) > 2 else 0.0,
            })
        except Exception:
            pass

    buffer.add_sample = patched_add_sample
    logger.info("🔧 buffer.add_sample patched → eeg_sample_queue")