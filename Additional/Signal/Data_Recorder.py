import serial
import csv
import time
import os
import sys
from datetime import datetime

# ================================================================
#                     ⚙️  SETTINGS
# ================================================================
COM_PORT        = "COM5"
BAUD_RATE       = 115200

RECORD_SECONDS  = 3        # Duration to record per trial (seconds)
PREPARE_SECONDS = 2        # Countdown before each trial starts
REST_SECONDS    = 3        # Rest gap between trials
TRIALS_PER_LABEL = 30      # Number of trials per label

SAVE_FOLDER     = "dataset"

# Mental task mapping (shown on screen)
LABEL_INSTRUCTIONS = {
    "YES":   "🖐  Imagine moving your RIGHT hand",
    "NO":    "🤚 Imagine moving your LEFT hand",
    "HELP":  "🧠 Imagine squeezing BOTH hands",
    "WATER": "👅 Imagine swallowing / thirst feeling",
}

VALID_LABELS = list(LABEL_INSTRUCTIONS.keys())
# ================================================================


# ----------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------

def clear_line():
    print(" " * 80, end="\r")

def countdown(seconds: int, message: str = ""):
    for i in range(seconds, 0, -1):
        print(f"  {message}  [{i}s] ", end="\r")
        time.sleep(1)
    clear_line()

def print_banner(text: str, char: str = "=", width: int = 60):
    print("\n" + char * width)
    print(f"  {text}")
    print(char * width)

def check_signal(ser, duration: int = 2) -> bool:
    """
    Quick sanity check: read `duration` seconds of data and
    report approximate sample rate + warn about flat/spiking signal.
    Returns True if signal looks OK, False otherwise.
    """
    print(f"\n  🔍 Checking signal quality for {duration} seconds...")
    samples = []
    start = time.time()

    while time.time() - start < duration:
        if ser.in_waiting:
            try:
                line = ser.readline().decode().strip()
                if not line or "timestamp" in line:
                    continue
                parts = line.split(",")
                if len(parts) == 4:
                    samples.append(float(parts[1]))   # ch1
            except Exception:
                pass

    if not samples:
        print("  ⚠️  WARNING: No data received! Check COM port and wiring.")
        return False

    approx_hz = len(samples) / duration
    ch1_range = max(samples) - min(samples)

    print(f"  ✅ Sample rate  ≈ {approx_hz:.0f} Hz")
    print(f"  ✅ CH1 range    = {ch1_range:.2f}")

    if ch1_range < 1:
        print("  ⚠️  WARNING: Signal is very flat — check electrode contact!")
        return False
    if ch1_range > 5000:
        print("  ⚠️  WARNING: Large spikes detected — check for loose wire / interference!")
        return False

    print("  ✅ Signal looks OK.\n")
    return True


def record_trial(ser, writer, label: str, trial_num: int) -> int:
    """
    Record one trial:
      1. Show instruction
      2. Countdown (PREPARE_SECONDS)
      3. Record for RECORD_SECONDS
      4. Rest
    Returns number of samples written.
    """
    instruction = LABEL_INSTRUCTIONS[label]

    print(f"\n  ── Trial {trial_num} ──")
    print(f"  👉 {instruction}")
    print()

    countdown(PREPARE_SECONDS, "Get ready...")

    print(f"  🔴 RECORDING... ", end="", flush=True)
    start_time = time.time()
    sample_count = 0

    while time.time() - start_time < RECORD_SECONDS:
        if ser.in_waiting:
            try:
                line = ser.readline().decode().strip()
                if not line or "timestamp" in line:
                    continue
                parts = line.split(",")
                if len(parts) != 4:
                    continue
                timestamp, ch1, ch2, ch3 = parts
                writer.writerow([timestamp, ch1, ch2, ch3, label, trial_num])
                sample_count += 1
            except Exception:
                pass

    print(f"{sample_count} samples captured.")

    if sample_count < 10:
        print("  ⚠️  Very few samples — trial may be unusable.")

    # Rest period
    countdown(REST_SECONDS, "🟢 REST")

    return sample_count


# ----------------------------------------------------------------
# Main
# ----------------------------------------------------------------

def main():
    # --- Folder ---
    os.makedirs(SAVE_FOLDER, exist_ok=True)

    # --- Serial connection ---
    print_banner("EEG Trial-Based Data Recorder")
    print(f"\n  Connecting to {COM_PORT} @ {BAUD_RATE} baud...")
    try:
        ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=0.1)
        time.sleep(2)
        print(f"  ✅ Connected.\n")
    except Exception as e:
        print(f"  ❌ Serial Error: {e}")
        sys.exit(1)

    # --- Label selection ---
    print("  Available labels:")
    for idx, lbl in enumerate(VALID_LABELS, 1):
        print(f"    {idx}. {lbl}  →  {LABEL_INSTRUCTIONS[lbl]}")

    label_input = input("\n  Enter label (e.g. YES): ").strip().upper()
    if label_input not in VALID_LABELS:
        print("  ❌ Invalid label. Exiting.")
        ser.close()
        sys.exit(1)

    label = label_input

    # --- Signal quality check ---
    if not check_signal(ser):
        ans = input("  Signal warning. Continue anyway? (y/n): ").strip().lower()
        if ans != "y":
            ser.close()
            sys.exit(0)

    # --- File setup ---
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(SAVE_FOLDER, f"{label}_{timestamp_str}.csv")

    file = open(filename, "w", newline="")
    writer = csv.writer(file)
    writer.writerow(["timestamp_us", "ch1", "ch2", "ch3", "label", "trial"])

    # --- Summary before start ---
    print_banner(f"Starting: {label} — {TRIALS_PER_LABEL} trials")
    print(f"  Each trial  : {RECORD_SECONDS}s record  |  {PREPARE_SECONDS}s prep  |  {REST_SECONDS}s rest")
    print(f"  Est. total  : ~{TRIALS_PER_LABEL * (PREPARE_SECONDS + RECORD_SECONDS + REST_SECONDS) // 60} min")
    print(f"  Saving to   : {filename}")
    input("\n  Press ENTER when the subject is ready...")

    # --- Recording loop ---
    total_samples = 0
    completed_trials = 0

    try:
        for trial in range(1, TRIALS_PER_LABEL + 1):
            n = record_trial(ser, writer, label, trial)
            total_samples += n
            completed_trials += 1

    except KeyboardInterrupt:
        print("\n\n  ⏹  Recording stopped manually.")

    finally:
        file.close()
        ser.close()

        print_banner("Session Complete", char="-")
        print(f"  Label            : {label}")
        print(f"  Trials completed : {completed_trials} / {TRIALS_PER_LABEL}")
        print(f"  Total samples    : {total_samples}")
        print(f"  Avg per trial    : {total_samples // max(completed_trials, 1)}")
        print(f"  File saved       : {filename}")
        print("-" * 60 + "\n")


if __name__ == "__main__":
    main()