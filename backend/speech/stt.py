# backend/speech/stt.py

from faster_whisper import WhisperModel
from utils.logger import get_logger

logger = get_logger("STT")


class SpeechToText:

    def __init__(self, model_size="base"):
        logger.info("Loading Faster-Whisper model (CPU mode)...")

        self.model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8"
        )

        logger.info("Whisper model loaded (CPU mode).")

    def transcribe_file(self, audio_path: str) -> str:

        try:
            segments, _ = self.model.transcribe(
                audio_path,
                beam_size=5,
                language="en",                    # skip language detection — saves ~200ms
                condition_on_previous_text=False, # each question is independent
                vad_filter=True,                  # built-in Silero VAD strips silence first
                vad_parameters=dict(
                    min_silence_duration_ms=500
                )
            )

            text = ""
            for segment in segments:
                text += segment.text + " "

            return text.strip()

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return ""