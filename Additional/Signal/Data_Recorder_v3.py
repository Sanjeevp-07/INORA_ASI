"""
INORA – EEG Data Collector
===========================
Collects labelled EEG trials for 3-word BCI classification.
Words: YES | NO | STOP

Controls:
  SPACE  →  Start / pause session
  Q      →  Quit and save

Trial structure per word:
  0.0s  REST       – relax, don't blink
  0.5s  CUE        – word appears (big, bold)
  2.5s  HOLD       – keep inner speech going
  3.0s  RELAX      – clear your mind
  3.5s  next trial begins

Run this file. The window opens full-screen style.
Data is saved to:  eeg_data/  (folder created automatically)
"""

import matplotlib
matplotlib.use("TkAgg")

import serial
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np
from collections import deque
import time
import csv
import os
import random
from datetime import datetime
from scipy.signal import butter, filtfilt, iirnotch
import matplotlib as mpl

mpl.rcParams['keymap.save']   = []
mpl.rcParams['keymap.quit']   = []
mpl.rcParams['keymap.zoom']   = []
mpl.rcParams['keymap.pan']    = []

# ═══════════════════════════════════════════════
#  SETTINGS  –  edit these
# ═══════════════════════════════════════════════
COM_PORT        = 'COM5'
BAUD_RATE       = 115200
SAMPLE_RATE     = 84            # your actual device rate
EEG_GAIN        = 11.0

WORDS           = ['YES', 'NO', 'STOP']
TRIALS_PER_WORD = 100           # 100 × 3 = 300 total trials
                                # do 30–40 per session, rest, continue

# Trial timing (seconds)
T_REST          = 1.0           # blank screen, relax
T_CUE_APPEAR    = 0.5           # arrow/get-ready before word
T_INNER_SPEECH  = 2.5           # word on screen, do inner speech
T_RELAX         = 0.5           # blank, clear mind

SAVE_DIR        = 'eeg_data'
# ═══════════════════════════════════════════════

os.makedirs(SAVE_DIR, exist_ok=True)

# ── Serial ──────────────────────────────────────
try:
    ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=0.1)
    time.sleep(2)
    print(f"✅  Serial connected: {COM_PORT}")
except Exception as e:
    print(f"❌  Serial error: {e}")
    exit()

# ── Filters ─────────────────────────────────────
def butter_bandpass(lo, hi, fs, order=4):
    nyq = 0.5 * fs
    return butter(order, [lo/nyq, hi/nyq], btype='band')

def notch(data, fs, freq=50, Q=30):
    nyq = 0.5 * fs
    if freq >= nyq:
        # 50 Hz notch impossible at this sample rate — skip silently
        return data
    b, a = iirnotch(freq, Q, fs)
    return filtfilt(b, a, data)

b_bp, a_bp = butter_bandpass(0.5, 40, SAMPLE_RATE)

def preprocess(buf):
    x = np.array(buf)
    x = x - np.mean(x)
    x = filtfilt(b_bp, a_bp, x)
    x = notch(x, SAMPLE_RATE)
    return x / EEG_GAIN

# ── Session state ────────────────────────────────
session_id      = datetime.now().strftime("%Y%m%d_%H%M%S")
trial_sequence  = []            # filled on start
trial_index     = 0
running         = False         # space toggles

# Counts per word already saved this session
saved_counts    = {w: 0 for w in WORDS}
total_target    = TRIALS_PER_WORD * len(WORDS)

# Current trial buffers
trial_samples   = []            # list of (ts, ch1, ch2, ch3) during recording
trial_phase     = 'idle'        # idle | rest | cue | record | relax
phase_start     = 0.0
current_word    = ''

# Rolling display buffer (last 5 s)
BUF = SAMPLE_RATE * 5
buf_ch1 = deque([0.0]*BUF, maxlen=BUF)
buf_ch2 = deque([0.0]*BUF, maxlen=BUF)
buf_ch3 = deque([0.0]*BUF, maxlen=BUF)

last_data_time  = time.time()
last_plot       = time.time()
PLOT_FPS        = 20

# ── CSV file ─────────────────────────────────────
csv_path   = os.path.join(SAVE_DIR, f"session_{session_id}.csv")
csv_file   = open(csv_path, 'w', newline='')
csv_writer = csv.writer(csv_file)
csv_writer.writerow([
    'session_id', 'trial_id', 'word_label',
    'sample_index', 'timestamp_s',
    'ch1_raw', 'ch2_raw', 'ch3_raw'
])
print(f"📁  Saving to: {csv_path}")

trial_counter = 0   # global unique trial id

# ── Build randomised trial sequence ──────────────
def build_sequence():
    """Balanced shuffle: every WORDS-length block has one of each word."""
    seq = []
    per_word = TRIALS_PER_WORD
    blocks = per_word  # one word per block position
    for _ in range(blocks):
        block = WORDS.copy()
        random.shuffle(block)
        seq.extend(block)
    return seq

# ── Save completed trial ──────────────────────────
def save_trial(word, samples):
    global trial_counter
    trial_counter += 1
    for i, (ts, v1, v2, v3) in enumerate(samples):
        csv_writer.writerow([
            session_id, trial_counter, word,
            i, f"{ts:.4f}", v1, v2, v3
        ])
    csv_file.flush()
    saved_counts[word] += 1
    print(f"  ✅  Trial {trial_counter:03d} saved  [{word}]  "
          f"total {word}: {saved_counts[word]}/{TRIALS_PER_WORD}")

# ══════════════════════════════════════════════════
#  PLOT SETUP
# ══════════════════════════════════════════════════
plt.style.use("dark_background")
plt.ion()

fig = plt.figure(figsize=(15, 9), facecolor='#080808')
fig.canvas.manager.set_window_title("INORA  –  EEG Data Collector")

# Layout: top cue area + 3 EEG plots + bottom status
gs = fig.add_gridspec(5, 1,
    height_ratios=[3.5, 2, 2, 2, 1],
    hspace=0.25,
    top=0.97, bottom=0.04, left=0.07, right=0.97)

ax_cue  = fig.add_subplot(gs[0])
ax_ch1  = fig.add_subplot(gs[1])
ax_ch2  = fig.add_subplot(gs[2])
ax_ch3  = fig.add_subplot(gs[3])
ax_bar  = fig.add_subplot(gs[4])

# ── Cue panel ────────────────────────────────────
ax_cue.set_facecolor('#0d0d0d')
ax_cue.set_xlim(0, 1); ax_cue.set_ylim(0, 1)
ax_cue.axis('off')

# Big word display
word_display = ax_cue.text(
    0.5, 0.52, '',
    ha='center', va='center',
    fontsize=96, fontweight='bold',
    color='white', fontfamily='monospace',
    transform=ax_cue.transAxes
)

# Phase label (REST / RELAX / FOCUS)
phase_display = ax_cue.text(
    0.5, 0.12, 'PRESS  SPACE  TO  BEGIN',
    ha='center', va='center',
    fontsize=13, color='#888',
    fontfamily='monospace',
    transform=ax_cue.transAxes
)

# Progress bar background
prog_bg = FancyBboxPatch(
    (0.05, 0.03), 0.90, 0.06,
    boxstyle="round,pad=0.005",
    facecolor='#1a1a1a', edgecolor='#333', linewidth=0.5,
    transform=ax_cue.transAxes
)
ax_cue.add_patch(prog_bg)

# Progress bar fill (updated dynamically)
prog_fill = FancyBboxPatch(
    (0.05, 0.03), 0.0, 0.06,
    boxstyle="round,pad=0.005",
    facecolor='#00ff88', edgecolor='none',
    transform=ax_cue.transAxes,
    zorder=2
)
ax_cue.add_patch(prog_fill)

prog_text = ax_cue.text(
    0.5, 0.065, '0 / 0',
    ha='center', va='center',
    fontsize=9, color='#444',
    fontfamily='monospace',
    transform=ax_cue.transAxes, zorder=3
)

# Word count badges (top right)
badge_texts = {}
badge_x = [0.60, 0.73, 0.86]
for i, w in enumerate(WORDS):
    ax_cue.text(
        badge_x[i], 0.93, w,
        ha='center', fontsize=10, color='#555',
        fontfamily='monospace',
        transform=ax_cue.transAxes
    )
    badge_texts[w] = ax_cue.text(
        badge_x[i], 0.80, '0',
        ha='center', fontsize=18, fontweight='bold',
        color='#333', fontfamily='monospace',
        transform=ax_cue.transAxes
    )

# ── EEG plots ────────────────────────────────────
x = np.arange(BUF)
COLORS = ['#00ff88', '#00cfff', '#ff9933']
lines = []
for ax, label, c in zip([ax_ch1, ax_ch2, ax_ch3],
                          ['Ch 1', 'Ch 2', 'Ch 3'], COLORS):
    ax.set_facecolor('#0a0a0a')
    ax.set_ylim(-80, 80)
    ax.set_xlim(0, BUF)
    ax.grid(alpha=0.12, color='#333')
    ax.set_ylabel(f'{label} (µV)', color=c, fontsize=9)
    ax.tick_params(colors='#555', labelsize=7)
    for sp in ax.spines.values():
        sp.set_edgecolor('#222')
    ln, = ax.plot(x, np.zeros(BUF), color=c, lw=0.8)
    lines.append(ln)

    # Recording highlight (red tint during inner speech phase)
    ax.axvspan(0, 0, color='red', alpha=0.07, zorder=0)

# Recording shade overlays
rec_spans = []
for ax in [ax_ch1, ax_ch2, ax_ch3]:
    span = ax.axvspan(0, 1, color='#ff3333', alpha=0.0, zorder=0)
    rec_spans.append(span)

# ── Status bar ───────────────────────────────────
ax_bar.set_facecolor('#080808'); ax_bar.axis('off')
ax_bar.set_xlim(0, 1); ax_bar.set_ylim(0, 1)

sig_dot   = ax_bar.scatter([0.02], [0.5], s=80, color='gray', zorder=5)
sig_lbl   = ax_bar.text(0.04, 0.5, 'NO DATA',
                          va='center', color='gray',
                          fontsize=9, fontfamily='monospace')

phase_lbl = ax_bar.text(0.22, 0.5, 'idle',
                          va='center', color='#555',
                          fontsize=9, fontfamily='monospace')

tip_lbl   = ax_bar.text(0.50, 0.5, '',
                          va='center', ha='center',
                          color='#666', fontsize=8,
                          fontfamily='monospace', style='italic')

key_lbl   = ax_bar.text(0.98, 0.5, '[SPACE] start/pause   [Q] quit',
                          va='center', ha='right',
                          color='#333', fontsize=8,
                          fontfamily='monospace')

# ═══════════════════════════════════════════════
#  PHASE TIPS  – shown in status bar
# ═══════════════════════════════════════════════
TIPS = {
    'rest':   'Relax jaw, shoulders, forehead. Don\'t blink.',
    'cue':    'Get ready — word is about to appear.',
    'record': 'Feel the mouth shape. Don\'t hear it — FEEL it.',
    'relax':  'Clear your mind completely.',
    'idle':   '',
}

WORD_COLORS = {
    'YES':  '#00ff88',
    'NO':   '#ff4444',
    'STOP': '#ffaa00',
}

# ═══════════════════════════════════════════════
#  KEYBOARD
# ═══════════════════════════════════════════════
def on_key(event):
    global running, trial_sequence, trial_index, trial_phase, phase_start

    if event.key == ' ':
        if not running:
            # Build sequence if first start
            if not trial_sequence:
                trial_sequence = build_sequence()
                print(f"\n🎯  Session started. {len(trial_sequence)} trials queued.")
                print(f"    Saving to: {csv_path}\n")
            running = True
            trial_phase  = 'rest'
            phase_start  = time.time()
            print("▶  Running...")
        else:
            running = False
            trial_phase = 'idle'
            print("⏸  Paused. Press SPACE to resume.")

    elif event.key == 'q' or event.key == 'Q':
        running = False
        csv_file.close()
        ser.close()
        total_saved = sum(saved_counts.values())
        print(f"\n📊  Session ended.")
        print(f"    Total trials saved: {total_saved}")
        for w in WORDS:
            print(f"      {w}: {saved_counts[w]}/{TRIALS_PER_WORD}")
        print(f"    File: {csv_path}")
        plt.close('all')

fig.canvas.mpl_connect('key_press_event', on_key)

# ═══════════════════════════════════════════════
#  HELPER: update cue display
# ═══════════════════════════════════════════════
def update_cue(phase, word):
    if phase == 'rest':
        word_display.set_text('+')
        word_display.set_color('#333')
        word_display.set_fontsize(60)
        phase_display.set_text('RELAX  —  breathe slowly')
        phase_display.set_color('#555')
        fig.patch.set_facecolor('#080808')

    elif phase == 'cue':
        word_display.set_text('▶')
        word_display.set_color('#555')
        word_display.set_fontsize(50)
        phase_display.set_text('GET  READY ...')
        phase_display.set_color('#888')

    elif phase == 'record':
        word_display.set_text(word)
        word_display.set_color(WORD_COLORS.get(word, 'white'))
        word_display.set_fontsize(96)
        phase_display.set_text('FEEL  THE  MOUTH  SHAPE  —  inner speech')
        phase_display.set_color(WORD_COLORS.get(word, 'white'))
        fig.patch.set_facecolor('#100808' if word == 'STOP'
                                 else '#081008' if word == 'YES'
                                 else '#100008')

    elif phase == 'relax':
        word_display.set_text('')
        phase_display.set_text('CLEAR  YOUR  MIND')
        phase_display.set_color('#444')
        fig.patch.set_facecolor('#080808')

    else:  # idle
        word_display.set_text('')
        phase_display.set_text('PRESS  SPACE  TO  BEGIN')
        phase_display.set_color('#555')
        fig.patch.set_facecolor('#080808')


# ═══════════════════════════════════════════════
#  MAIN LOOP
# ═══════════════════════════════════════════════
print("\n  ╔══════════════════════════════════════╗")
print("  ║   INORA  EEG  Data  Collector        ║")
print("  ╠══════════════════════════════════════╣")
print("  ║  [SPACE]  Start / Pause              ║")
print("  ║  [Q]      Quit & save                ║")
print("  ╚══════════════════════════════════════╝\n")

try:
    while plt.fignum_exists(fig.number):

        now = time.time()

        # ── Read serial ──────────────────────────
        v1_raw, v2_raw, v3_raw = 0.0, 0.0, 0.0
        new_sample = False

        while ser.in_waiting:
            try:
                raw = ser.readline().decode(errors='ignore').strip()
                if not raw or 'timestamp' in raw:
                    continue
                parts = raw.split(',')
                if len(parts) != 4:
                    continue
                _, v1_raw, v2_raw, v3_raw = parts
                v1_raw = float(v1_raw)
                v2_raw = float(v2_raw)
                v3_raw = float(v3_raw)

                buf_ch1.append(v1_raw)
                buf_ch2.append(v2_raw)
                buf_ch3.append(v3_raw)

                last_data_time = now
                new_sample = True

                # Record sample if in recording phase
                if running and trial_phase == 'record':
                    elapsed = now - phase_start
                    trial_samples.append((elapsed, v1_raw, v2_raw, v3_raw))

            except Exception:
                pass

        # ── Trial state machine ──────────────────
        if running and trial_index < len(trial_sequence):

            current_word = trial_sequence[trial_index]
            elapsed      = now - phase_start

            if trial_phase == 'rest' and elapsed >= T_REST:
                trial_phase = 'cue'
                phase_start = now
                update_cue('cue', current_word)

            elif trial_phase == 'cue' and elapsed >= T_CUE_APPEAR:
                trial_phase   = 'record'
                phase_start   = now
                trial_samples = []
                update_cue('record', current_word)

            elif trial_phase == 'record' and elapsed >= T_INNER_SPEECH:
                # Save completed trial
                if trial_samples:
                    save_trial(current_word, trial_samples)
                trial_samples = []
                trial_phase   = 'relax'
                phase_start   = now
                update_cue('relax', current_word)

            elif trial_phase == 'relax' and elapsed >= T_RELAX:
                trial_index += 1
                if trial_index >= len(trial_sequence):
                    # Session complete
                    running = False
                    trial_phase = 'idle'
                    word_display.set_text('✓')
                    word_display.set_color('#00ff88')
                    word_display.set_fontsize(72)
                    phase_display.set_text('SESSION  COMPLETE  —  press Q to save and quit')
                    phase_display.set_color('#00ff88')
                    print("\n🎉  All trials complete!")
                else:
                    trial_phase = 'rest'
                    phase_start = now
                    update_cue('rest', current_word)

        elif running and trial_index >= len(trial_sequence):
            running = False

        # ── Plot update ───────────────────────────
        if now - last_plot >= 1.0 / PLOT_FPS:

            # EEG lines
            d1 = preprocess(buf_ch1)
            d2 = preprocess(buf_ch2)
            d3 = preprocess(buf_ch3)

            for ln, d in zip(lines, [d1, d2, d3]):
                ln.set_ydata(d)

            for ax, d in zip([ax_ch1, ax_ch2, ax_ch3], [d1, d2, d3]):
                pk = max(60, np.max(np.abs(d)) * 1.3)
                ax.set_ylim(-pk, pk)

            # Recording highlight
            alpha = 0.06 if (running and trial_phase == 'record') else 0.0
            for sp in rec_spans:
                sp.set_alpha(alpha)

            # Signal dot
            no_data = (now - last_data_time > 2)
            sig_dot.set_color('red' if no_data else '#00ff88')
            sig_lbl.set_text('NO DATA' if no_data else 'LIVE   ')
            sig_lbl.set_color('red' if no_data else '#00ff88')

            # Phase label in status bar
            phase_lbl.set_text(f"phase: {trial_phase}  |  "
                                f"trial {trial_index+1}/{len(trial_sequence) if trial_sequence else '?'}")
            tip_lbl.set_text(TIPS.get(trial_phase, ''))

            # Progress bar
            total_done = sum(saved_counts.values())
            total_seq  = len(trial_sequence) if trial_sequence else total_target
            frac       = total_done / total_seq if total_seq else 0
            prog_fill.set_width(0.90 * frac)
            prog_text.set_text(f"{total_done} / {total_seq} trials")
            if total_done > 0:
                prog_text.set_color('#00ff88')

            # Word badges
            for w in WORDS:
                count = saved_counts[w]
                badge_texts[w].set_text(str(count))
                if count >= TRIALS_PER_WORD:
                    badge_texts[w].set_color('#00ff88')
                elif count > 0:
                    badge_texts[w].set_color(WORD_COLORS[w])
                else:
                    badge_texts[w].set_color('#333')

            fig.canvas.draw_idle()
            fig.canvas.flush_events()
            last_plot = now

        time.sleep(0.002)

except KeyboardInterrupt:
    print("\nInterrupted.")

finally:
    if not csv_file.closed:
        csv_file.close()
    try:
        ser.close()
    except Exception:
        pass
    try:
        plt.close('all')
    except Exception:
        pass
    total_saved = sum(saved_counts.values())
    print(f"\n📁  Data saved: {csv_path}")
    print(f"    Trials: {total_saved} total")
    for w in WORDS:
        print(f"      {w}: {saved_counts[w]}")
    print("Clean exit.")