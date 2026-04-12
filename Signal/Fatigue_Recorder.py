"""
INORA – Mental Fatigue EEG Recorder
=====================================
Records 10 minutes of continuous EEG for mental fatigue detection.

Study Design:
  Session A  →  Subject is FRESH  (PRE-reel)
  Subject scrolls reels for 30 minutes
  Session B  →  Subject is FATIGUED  (POST-reel)

No trial labels. Just raw continuous EEG + metadata.

Saved file:
  fatigue_data/
    subject_<ID>_<PRE|POST>_<timestamp>.csv

CSV columns:
  subject_id, session_type, elapsed_s, sample_index,
  ch1_raw, ch2_raw, ch3_raw

Controls:
  SPACE  →  Start / Pause recording
  Q      →  Stop and save
"""

import matplotlib
matplotlib.use("TkAgg")

import serial
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import numpy as np
from collections import deque
import time
import csv
import os
from datetime import datetime
from scipy.signal import butter, filtfilt, iirnotch
import matplotlib as mpl

mpl.rcParams['keymap.save'] = []
mpl.rcParams['keymap.quit'] = []
mpl.rcParams['keymap.zoom'] = []
mpl.rcParams['keymap.pan']  = []

# ═══════════════════════════════════════════════
#  SETTINGS  –  edit before each session
# ═══════════════════════════════════════════════
COM_PORT        = 'COM5'
BAUD_RATE       = 115200
SAMPLE_RATE     = 84            # Hz — your device rate
EEG_GAIN        = 11.0

RECORD_MINUTES  = 10            # total session length
SAVE_DIR        = 'fatigue_data'

# ── Fill these before each session ──────────────
SUBJECT_ID      = 'S01'         # e.g. S01, S02 ...
SESSION_TYPE    = 'PRE'         # 'PRE'  or  'POST'
# ════════════════════════════════════════════════

RECORD_SECONDS  = RECORD_MINUTES * 60
os.makedirs(SAVE_DIR, exist_ok=True)

# ── Serial ───────────────────────────────────────
try:
    ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=0.1)
    time.sleep(2)
    print(f"✅  Serial connected: {COM_PORT}")
except Exception as e:
    print(f"❌  Serial error: {e}")
    exit()

# ── Filters ──────────────────────────────────────
def butter_bandpass(lo, hi, fs, order=4):
    nyq = 0.5 * fs
    return butter(order, [lo/nyq, hi/nyq], btype='band')

def notch_filter(data, fs, freq=50, Q=30):
    nyq = 0.5 * fs
    if freq >= nyq:
        return data
    b, a = iirnotch(freq, Q, fs)
    return filtfilt(b, a, data)

b_bp, a_bp = butter_bandpass(0.5, 40, SAMPLE_RATE)

def preprocess(buf):
    x = np.array(buf, dtype=float)
    x = x - np.mean(x)
    x = filtfilt(b_bp, a_bp, x)
    x = notch_filter(x, SAMPLE_RATE)
    return x / EEG_GAIN

# ── State ─────────────────────────────────────────
session_ts      = datetime.now().strftime("%Y%m%d_%H%M%S")
csv_filename    = f"subject_{SUBJECT_ID}_{SESSION_TYPE}_{session_ts}.csv"
csv_path        = os.path.join(SAVE_DIR, csv_filename)

csv_file        = open(csv_path, 'w', newline='')
csv_writer      = csv.writer(csv_file)
csv_writer.writerow([
    'subject_id', 'session_type', 'elapsed_s',
    'sample_index', 'ch1_raw', 'ch2_raw', 'ch3_raw'
])

recording       = False
rec_start_time  = None
sample_index    = 0             # global counter across pauses
total_samples   = 0

last_data_time  = time.time()
last_plot       = time.time()
PLOT_FPS        = 20

# Rolling display buffer — 8 seconds visible
BUF             = SAMPLE_RATE * 8
buf_ch1         = deque([0.0]*BUF, maxlen=BUF)
buf_ch2         = deque([0.0]*BUF, maxlen=BUF)
buf_ch3         = deque([0.0]*BUF, maxlen=BUF)

# Amplitude warning
WARN_YELLOW     = 80
WARN_RED        = 150
blink_state     = True

print(f"\n📋  Subject  : {SUBJECT_ID}")
print(f"    Session  : {SESSION_TYPE}")
print(f"    Duration : {RECORD_MINUTES} minutes")
print(f"    File     : {csv_path}\n")

# ══════════════════════════════════════════════════
#  PLOT LAYOUT
# ══════════════════════════════════════════════════
plt.style.use("dark_background")
plt.ion()

fig = plt.figure(figsize=(15, 9), facecolor='#080808')
fig.canvas.manager.set_window_title(
    f"INORA  –  Fatigue Recorder  |  {SUBJECT_ID}  {SESSION_TYPE}")

gs = fig.add_gridspec(
    5, 1,
    height_ratios=[2.5, 2, 2, 2, 1],
    hspace=0.25,
    top=0.97, bottom=0.04, left=0.07, right=0.97
)

ax_info = fig.add_subplot(gs[0])   # top info / timer panel
ax_ch1  = fig.add_subplot(gs[1])
ax_ch2  = fig.add_subplot(gs[2])
ax_ch3  = fig.add_subplot(gs[3])
ax_bar  = fig.add_subplot(gs[4])   # bottom status bar

# ── Info panel ────────────────────────────────────
ax_info.set_facecolor('#0d0d0d')
ax_info.set_xlim(0, 1)
ax_info.set_ylim(0, 1)
ax_info.axis('off')

SESSION_COLOR = '#00cfff' if SESSION_TYPE == 'PRE' else '#ff9933'

# Subject + session badge (top left)
ax_info.text(
    0.02, 0.88,
    f"Subject  {SUBJECT_ID}",
    ha='left', va='top',
    fontsize=14, fontweight='bold',
    color='white', fontfamily='monospace',
    transform=ax_info.transAxes
)
ax_info.text(
    0.02, 0.62,
    f"Session  →  {SESSION_TYPE}-reel",
    ha='left', va='top',
    fontsize=11,
    color=SESSION_COLOR, fontfamily='monospace',
    transform=ax_info.transAxes
)

# Instruction line (changes with state)
instruction = ax_info.text(
    0.5, 0.75,
    'SIT  STILL  —  PRESS  SPACE  TO  BEGIN',
    ha='center', va='center',
    fontsize=13, color='#666',
    fontfamily='monospace',
    transform=ax_info.transAxes
)

# Giant timer in centre
timer_display = ax_info.text(
    0.5, 0.38,
    '10:00',
    ha='center', va='center',
    fontsize=64, fontweight='bold',
    color='#333', fontfamily='monospace',
    transform=ax_info.transAxes
)

# Progress bar bg
prog_bg = FancyBboxPatch(
    (0.05, 0.04), 0.90, 0.10,
    boxstyle="round,pad=0.005",
    facecolor='#1a1a1a', edgecolor='#2a2a2a', linewidth=0.5,
    transform=ax_info.transAxes
)
ax_info.add_patch(prog_bg)

# Progress bar fill
prog_fill = FancyBboxPatch(
    (0.05, 0.04), 0.0, 0.10,
    boxstyle="round,pad=0.005",
    facecolor=SESSION_COLOR, edgecolor='none',
    transform=ax_info.transAxes, zorder=2
)
ax_info.add_patch(prog_fill)

prog_pct = ax_info.text(
    0.5, 0.09, '0%',
    ha='center', va='center',
    fontsize=8, color='#444',
    fontfamily='monospace',
    transform=ax_info.transAxes, zorder=3
)

# Sample counter (top right)
sample_lbl = ax_info.text(
    0.98, 0.88, '0 samples',
    ha='right', va='top',
    fontsize=9, color='#555',
    fontfamily='monospace',
    transform=ax_info.transAxes
)

# Warning box (hidden until needed)
warn_box = FancyBboxPatch(
    (0.75, 0.50), 0.22, 0.35,
    boxstyle="round,pad=0.01",
    facecolor='#1a1a1a', edgecolor='none',
    transform=ax_info.transAxes, zorder=4
)
ax_info.add_patch(warn_box)

warn_lbl = ax_info.text(
    0.86, 0.68, '',
    ha='center', va='center',
    fontsize=9, color='#333',
    fontfamily='monospace',
    transform=ax_info.transAxes, zorder=5
)

# ── EEG channel plots ─────────────────────────────
COLORS = ['#00ff88', '#00cfff', '#ff9933']
x_axis = np.arange(BUF)
lines  = []

for ax, label, c in zip([ax_ch1, ax_ch2, ax_ch3],
                          ['Ch 1', 'Ch 2', 'Ch 3'], COLORS):
    ax.set_facecolor('#0a0a0a')
    ax.set_ylim(-80, 80)
    ax.set_xlim(0, BUF)
    ax.grid(alpha=0.12, color='#2a2a2a')
    ax.set_ylabel(f'{label} (µV)', color=c, fontsize=9)
    ax.tick_params(colors='#444', labelsize=7)
    ax.axhline( WARN_YELLOW, color='#555500', lw=0.5, ls='--')
    ax.axhline(-WARN_YELLOW, color='#555500', lw=0.5, ls='--')
    ax.axhline( WARN_RED,    color='#550000', lw=0.5, ls='--')
    ax.axhline(-WARN_RED,    color='#550000', lw=0.5, ls='--')
    for sp in ax.spines.values():
        sp.set_edgecolor('#1a1a1a')
    ln, = ax.plot(x_axis, np.zeros(BUF), color=c, lw=0.8)
    lines.append(ln)

# Recording highlight spans
rec_spans = []
for ax in [ax_ch1, ax_ch2, ax_ch3]:
    sp = ax.axvspan(0, BUF, color=SESSION_COLOR, alpha=0.0, zorder=0)
    rec_spans.append(sp)

# ── Status bar ────────────────────────────────────
ax_bar.set_facecolor('#080808')
ax_bar.axis('off')
ax_bar.set_xlim(0, 1)
ax_bar.set_ylim(0, 1)

sig_dot = ax_bar.scatter([0.02], [0.5], s=80, color='gray', zorder=5)
sig_lbl = ax_bar.text(
    0.045, 0.5, 'NO DATA',
    va='center', color='gray',
    fontsize=9, fontfamily='monospace'
)

rate_lbl = ax_bar.text(
    0.20, 0.5, 'Rate: -- Hz',
    va='center', color='#444',
    fontsize=9, fontfamily='monospace'
)

state_lbl = ax_bar.text(
    0.42, 0.5, 'idle',
    va='center', color='#444',
    fontsize=9, fontfamily='monospace'
)

key_lbl = ax_bar.text(
    0.98, 0.5, '[SPACE] start/pause   [Q] quit & save',
    va='center', ha='right',
    color='#2a2a2a', fontsize=8,
    fontfamily='monospace'
)

# ══════════════════════════════════════════════════
#  KEYBOARD
# ══════════════════════════════════════════════════
def on_key(event):
    global recording, rec_start_time

    if event.key == ' ':
        if not recording:
            if rec_start_time is None:
                rec_start_time = time.time()
                print(f"⏺  Recording started.")
            else:
                # resuming after pause — adjust start time
                print(f"▶  Resumed.")
            recording = True
            instruction.set_text('RELAX  —  SIT  STILL  —  BREATHE  NORMALLY')
            instruction.set_color(SESSION_COLOR)
            timer_display.set_color('white')
            for sp in rec_spans:
                sp.set_alpha(0.04)
        else:
            recording = False
            print(f"⏸  Paused. Press SPACE to resume.")
            instruction.set_text('PAUSED  —  PRESS  SPACE  TO  RESUME')
            instruction.set_color('#888')
            for sp in rec_spans:
                sp.set_alpha(0.0)

    elif event.key in ('q', 'Q'):
        recording = False
        _finish_session()
        plt.close('all')

fig.canvas.mpl_connect('key_press_event', on_key)

# ══════════════════════════════════════════════════
#  FINISH
# ══════════════════════════════════════════════════
def _finish_session():
    csv_file.flush()
    csv_file.close()
    mins = total_samples // SAMPLE_RATE // 60
    secs = (total_samples // SAMPLE_RATE) % 60
    print(f"\n✅  Session complete.")
    print(f"    Subject      : {SUBJECT_ID}")
    print(f"    Session type : {SESSION_TYPE}")
    print(f"    Duration     : {mins:02d}:{secs:02d}")
    print(f"    Samples      : {total_samples:,}")
    print(f"    File         : {csv_path}")

# ══════════════════════════════════════════════════
#  SAMPLE RATE MONITOR
# ══════════════════════════════════════════════════
rate_counter    = 0
last_rate_check = time.time()
actual_rate     = 0

# ══════════════════════════════════════════════════
#  PRINT BANNER
# ══════════════════════════════════════════════════
print("  ╔══════════════════════════════════════════╗")
print(f"  ║   INORA  –  Mental Fatigue Recorder      ║")
print(f"  ╠══════════════════════════════════════════╣")
print(f"  ║  Subject   : {SUBJECT_ID:<28}║")
print(f"  ║  Session   : {SESSION_TYPE:<28}║")
print(f"  ║  Duration  : {RECORD_MINUTES} minutes{'':<21}║")
print(f"  ╠══════════════════════════════════════════╣")
print(f"  ║  [SPACE]   Start / Pause                 ║")
print(f"  ║  [Q]       Stop and save                 ║")
print(f"  ╚══════════════════════════════════════════╝\n")

# ══════════════════════════════════════════════════
#  MAIN LOOP
# ══════════════════════════════════════════════════
try:
    while plt.fignum_exists(fig.number):

        now = time.time()

        # ── Read serial ──────────────────────────
        while ser.in_waiting:
            try:
                raw_line = ser.readline().decode(errors='ignore').strip()
                if not raw_line or 'timestamp' in raw_line:
                    continue
                parts = raw_line.split(',')
                if len(parts) != 4:
                    continue

                _, v1, v2, v3 = parts
                v1 = float(v1)
                v2 = float(v2)
                v3 = float(v3)

                buf_ch1.append(v1)
                buf_ch2.append(v2)
                buf_ch3.append(v3)

                last_data_time = now
                rate_counter  += 1

                # ── Write to CSV if recording ────
                if recording and rec_start_time is not None:
                    elapsed = now - rec_start_time
                    if elapsed <= RECORD_SECONDS:
                        csv_writer.writerow([
                            SUBJECT_ID, SESSION_TYPE,
                            f"{elapsed:.4f}",
                            sample_index,
                            v1, v2, v3
                        ])
                        sample_index  += 1
                        total_samples += 1

            except Exception:
                pass

        # ── Auto-stop at RECORD_SECONDS ──────────
        if recording and rec_start_time is not None:
            elapsed = now - rec_start_time
            if elapsed >= RECORD_SECONDS:
                recording = False
                timer_display.set_text('00:00')
                timer_display.set_color('#00ff88')
                instruction.set_text('SESSION  COMPLETE  —  press  Q  to  save')
                instruction.set_color('#00ff88')
                prog_fill.set_width(0.90)
                prog_pct.set_text('100%')
                prog_pct.set_color('#00ff88')
                for sp in rec_spans:
                    sp.set_alpha(0.0)
                print("\n🎉  10 minutes complete! Press Q to save.")

        # ── Sample rate monitor ───────────────────
        if now - last_rate_check >= 1.0:
            actual_rate    = rate_counter
            rate_counter   = 0
            last_rate_check = now

        # ── Flush CSV every 5 seconds ─────────────
        if total_samples % (SAMPLE_RATE * 5) < 5:
            csv_file.flush()

        # ── Plot update ───────────────────────────
        if now - last_plot >= 1.0 / PLOT_FPS:
            blink_state = not blink_state

            # Filter and plot
            d1 = preprocess(buf_ch1)
            d2 = preprocess(buf_ch2)
            d3 = preprocess(buf_ch3)

            for ln, d in zip(lines, [d1, d2, d3]):
                ln.set_ydata(d)

            for ax, d in zip([ax_ch1, ax_ch2, ax_ch3], [d1, d2, d3]):
                pk = max(60, np.max(np.abs(d)) * 1.3)
                ax.set_ylim(-pk, pk)

            # Warning system
            peak = max(
                np.max(np.abs(d1)),
                np.max(np.abs(d2)),
                np.max(np.abs(d3))
            )

            if peak >= WARN_RED:
                warn_box.set_facecolor('#2a0000' if blink_state else '#1a0000')
                warn_lbl.set_text('⚠ HIGH AMP\ncheck electrodes')
                warn_lbl.set_color('#ff4444')
                fig.patch.set_facecolor('#120000' if blink_state else '#080808')
            elif peak >= WARN_YELLOW:
                warn_box.set_facecolor('#1a1500')
                warn_lbl.set_text('◆ CAUTION\n>80µV')
                warn_lbl.set_color('#ffcc00')
                fig.patch.set_facecolor('#080808')
            else:
                warn_box.set_facecolor('#0a0a0a')
                warn_lbl.set_text('● CLEAN\nsignal')
                warn_lbl.set_color('#00ff88')
                fig.patch.set_facecolor('#080808')

            # Timer countdown
            if rec_start_time is not None and recording:
                elapsed     = now - rec_start_time
                remaining   = max(0, RECORD_SECONDS - elapsed)
                mins_r      = int(remaining) // 60
                secs_r      = int(remaining) % 60
                timer_display.set_text(f"{mins_r:02d}:{secs_r:02d}")

                # Progress bar
                frac = min(elapsed / RECORD_SECONDS, 1.0)
                prog_fill.set_width(0.90 * frac)
                pct = int(frac * 100)
                prog_pct.set_text(f"{pct}%")
                if pct > 0:
                    prog_pct.set_color('white')

            # Sample counter
            sample_lbl.set_text(
                f"{total_samples:,} samples  |  "
                f"{total_samples // SAMPLE_RATE // 60:02d}:"
                f"{(total_samples // SAMPLE_RATE) % 60:02d} recorded"
            )

            # Signal dot
            no_data = (now - last_data_time > 2)
            sig_dot.set_color('red' if no_data else '#00ff88')
            sig_lbl.set_text('NO DATA' if no_data else 'LIVE   ')
            sig_lbl.set_color('red' if no_data else '#00ff88')

            # Rate + state
            rate_lbl.set_text(f"Rate: {actual_rate} Hz")
            state_str = (
                f"{'● REC' if recording else '⏸ PAUSED' if rec_start_time else 'idle'}"
                f"  |  {SUBJECT_ID}  {SESSION_TYPE}"
            )
            state_lbl.set_text(state_str)
            state_lbl.set_color(
                SESSION_COLOR if recording else '#555'
            )

            fig.canvas.draw_idle()
            fig.canvas.flush_events()
            last_plot = now

        time.sleep(0.002)

except KeyboardInterrupt:
    print("\nInterrupted.")

finally:
    if not csv_file.closed:
        _finish_session()
    try:
        ser.close()
    except Exception:
        pass
    try:
        plt.close('all')
    except Exception:
        pass
    print("Clean exit.")