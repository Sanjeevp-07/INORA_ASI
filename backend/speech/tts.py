# backend/speech/tts.py

import asyncio
import time
import os
from utils.logger import get_logger

logger = get_logger("TTS")

# Edge TTS voice options — all free Microsoft neural voices
# "en-US-JennyNeural"     → warm, friendly female (recommended)
# "en-US-AriaNeural"      → clear, professional female
# "en-US-GuyNeural"       → natural male
# "en-GB-SoniaNeural"     → British female
VOICE = "en-US-JennyNeural"


class TextToSpeech:
    def __init__(self):
        self.output_dir = "generated_audio"
        os.makedirs(self.output_dir, exist_ok=True)
        self._check_edge_tts()

    def _check_edge_tts(self):
        try:
            import edge_tts
            logger.info(f"TTS Ready (Edge TTS — voice: {VOICE})")
        except ImportError:
            logger.error("TTS | edge-tts not installed! Run: python -m pip install edge-tts")

    def generate_audio(self, text: str) -> str:
        """
        Saves speech as MP3 file.
        Browser plays it via audio_url — no double playback.
        Returns the file path on success, None on failure.
        """
        if not text:
            return None

        try:
            filename = f"response_{int(time.time() * 1000)}.mp3"
            filepath = os.path.join(self.output_dir, filename)

            # Edge TTS is async — run it in a clean event loop
            asyncio.run(self._synthesize(text, filepath))

            logger.info(f"✅ TTS saved: {filepath}")
            return filepath

        except Exception as e:
            logger.error(f"TTS generation error: {e}", exc_info=True)
            return None

    async def _synthesize(self, text: str, filepath: str):
        import edge_tts
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(filepath)