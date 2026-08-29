import matplotlib
matplotlib.use("TkAgg")

import serial
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from collections import deque
import time
from scipy.signal import butter, filtfilt, iirnotch
import matplotlib as mpl
import csv
import os
from datetime import datetime

mpl.rcParams['keymap.save'] = []
mpl.rcParams['keymap.quit'] = ['ctrl+w']

# ================= SETTINGS =================
COM_PORT        = 'COM5'
BAUD_RATE       = 115200
SAMPLE_RATE     = 250          # Hz
BUFFER_SECONDS  = 5
PLOT_FPS        = 30
EEG_GAIN        = 11.0

# --- Warning thresholds (µV) ---
WARN_YELLOW     = 80           # caution zone
WARN_RED        = 150          # hard warning (artifact / bad contact)

# --- Recording ---
SAVE_DIR        = "eeg_recordings"   # folder next to this script
# ============================================

os.makedirs(SAVE_DIR, exist_ok=True)

# ---------- SERIAL ----------
try:
    ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=0.1)
    time.sleep(2)
    print(f"✅  Connected to {COM_PORT}")
except Exception as e:
    print("❌  Serial Error:", e)
    exit()

# ---------- BUFFERS ----------
buffer_size = SAMPLE_RATE * BUFFER_SECONDS
buf_ch1 = deque([0.0]*buffer_size, maxlen=buffer_size)
buf_ch2 = deque([0.0]*buffer_size, maxlen=buffer_size)
buf_ch3 = deque([0.0]*buffer_size, maxlen=buffer_size)

# ---------- STATE ----------
recording       = False
rec_file        = None
rec_writer      = None
rec_start_time  = None
rec_filename    = ""
rec_sample_count= 0

last_data_time  = time.time()
sample_counter  = 0
last_rate_check = time.time()
last_plot       = time.time()
actual_rate     = 0

warn_state      = "OK"   # OK | YELLOW | RED
warn_history    = deque(maxlen=60)   # last 60 frames

# ---------- FILTERS ----------
def butter_bandpass(low, high, fs, order=4):
    nyq = 0.5 * fs
    return butter(order, [low/nyq, high/nyq], btype='band')

def notch_filter(data, fs, freq=50, Q=30):
    b, a = iirnotch(freq, Q, fs)
    return filtfilt(b, a, data)

b_bp, a_bp = butter_bandpass(0.5, 45, SAMPLE_RATE)

def preprocess(buf):
    x = np.array(buf)
    x = x - np.mean(x)
    x = filtfilt(b_bp, a_bp, x)
    x = notch_filter(x, SAMPLE_RATE)
    return x / EEG_GAIN

# ---------- RECORDING HELPERS ----------
def start_recording():
    global recording, rec_file, rec_writer, rec_start_time, rec_filename, rec_sample_count
    if recording:
        return
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    rec_filename = os.path.join(SAVE_DIR, f"eeg_{ts}.csv")
    rec_file     = open(rec_filename, 'w', newline='')
    rec_writer   = csv.writer(rec_file)
    rec_writer.writerow(["timestamp_s", "ch1_raw", "ch2_raw", "ch3_raw"])
    rec_start_time  = time.time()
    rec_sample_count= 0
    recording       = True
    print(f"⏺  Recording started → {rec_filename}")

def stop_recording():
    global recording, rec_file, rec_writer
    if not recording:
        return
    recording = False
    rec_file.close()
    rec_file   = None
    rec_writer = None
    print(f"⏹  Recording stopped. Samples saved: {rec_sample_count}  File: {rec_filename}")

# ---------- PLOT SETUP ----------
plt.style.use("dark_background")
plt.ion()

fig = plt.figure(figsize=(15, 9))
fig.patch.set_facecolor('#0d0d0d')

# Layout: 3 EEG rows + 1 status bar row
gs = fig.add_gridspec(4, 1, height_ratios=[3, 3, 3, 1], hspace=0.35)
ax1 = fig.add_subplot(gs[0])
ax2 = fig.add_subplot(gs[1], sharex=ax1)
ax3 = fig.add_subplot(gs[2], sharex=ax2)
ax_bar = fig.add_subplot(gs[3])

COLORS = ['#00ff88', '#00cfff', '#ff9933']
x = np.arange(buffer_size)

line1, = ax1.plot(x, np.zeros(buffer_size), color=COLORS[0], lw=0.9)
line2, = ax2.plot(x, np.zeros(buffer_size), color=COLORS[1], lw=0.9)
line3, = ax3.plot(x, np.zeros(buffer_size), color=COLORS[2], lw=0.9)

# Threshold reference lines
for ax, c in zip([ax1, ax2, ax3], COLORS):
    ax.axhline( WARN_YELLOW, color='yellow', lw=0.5, ls='--', alpha=0.5)
    ax.axhline(-WARN_YELLOW, color='yellow', lw=0.5, ls='--', alpha=0.5)
    ax.axhline( WARN_RED,    color='red',    lw=0.5, ls='--', alpha=0.4)
    ax.axhline(-WARN_RED,    color='red',    lw=0.5, ls='--', alpha=0.4)

for ax, label, c in zip([ax1, ax2, ax3],
                         ["Ch 1", "Ch 2", "Ch 3"], COLORS):
    ax.set_ylabel(f"{label} (µV)", color=c, fontsize=10)
    ax.set_ylim(-100, 100)
    ax.set_facecolor('#111111')
    ax.grid(alpha=0.15, color='#444')
    ax.tick_params(colors='#aaa', labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor('#333')

ax3.set_xlabel("Samples", color='#888', fontsize=9)

# Title
title_text = fig.text(0.5, 0.97,
                       "INORA  –  EEG Recorder",
                       ha='center', va='top',
                       color='white', fontsize=16,
                       fontweight='bold', fontfamily='monospace')

# ---------- STATUS BAR ----------
ax_bar.set_facecolor('#0d0d0d')
ax_bar.set_xlim(0, 1)
ax_bar.set_ylim(0, 1)
ax_bar.axis('off')

# Signal indicator dot
sig_dot = ax_bar.scatter([0.03], [0.5], s=120, color='gray', zorder=5)
sig_label = ax_bar.text(0.065, 0.5, "NO DATA",
                         va='center', color='gray', fontsize=10,
                         fontfamily='monospace')

# Rate label
rate_label = ax_bar.text(0.22, 0.5, "Rate: -- Hz",
                          va='center', color='#888', fontsize=9,
                          fontfamily='monospace')

# Warning banner
warn_box = mpatches.FancyBboxPatch((0.38, 0.1), 0.24, 0.8,
                                    boxstyle="round,pad=0.05",
                                    linewidth=0,
                                    facecolor='#1a1a1a', zorder=3)
ax_bar.add_patch(warn_box)
warn_label = ax_bar.text(0.50, 0.5, "● SIGNAL OK",
                          va='center', ha='center',
                          color='#00ff88', fontsize=10,
                          fontfamily='monospace', fontweight='bold', zorder=4)

# Recording indicator
rec_dot   = ax_bar.scatter([0.70], [0.5], s=100, color='#333', zorder=5)
rec_label = ax_bar.text(0.73, 0.5, "NOT RECORDING",
                         va='center', color='#555', fontsize=9,
                         fontfamily='monospace')

# Timer label
rec_timer = ax_bar.text(0.90, 0.5, "",
                         va='center', ha='center',
                         color='#888', fontsize=9,
                         fontfamily='monospace')

# ---------- KEYBOARD SHORTCUTS ----------
def on_key(event):
    if event.key == 'r':
        if not recording:
            start_recording()
        else:
            stop_recording()
    elif event.key == 'q':
        plt.close('all')

fig.canvas.mpl_connect('key_press_event', on_key)

# ---------- HELPER: warn color ----------
def get_warn_state(peak):
    if peak >= WARN_RED:
        return "RED"
    elif peak >= WARN_YELLOW:
        return "YELLOW"
    return "OK"

print("\n  Controls:")
print("  [R]  Start / Stop recording")
print("  [Q]  Quit\n")
print("  Threshold lines: yellow = 80 µV | red = 150 µV\n")

blink_on = True

# ---------- MAIN LOOP ----------
try:
    while plt.fignum_exists(fig.number):

        # --- Read serial ---
        while ser.in_waiting:
            try:
                raw = ser.readline().decode().strip()
                if not raw or "timestamp" in raw:
                    continue
                parts = raw.split(',')
                if len(parts) != 4:
                    continue
                _, v1, v2, v3 = parts
                v1, v2, v3 = float(v1), float(v2), float(v3)

                buf_ch1.append(v1)
                buf_ch2.append(v2)
                buf_ch3.append(v3)

                sample_counter += 1
                last_data_time  = time.time()

                # --- Save to CSV if recording ---
                if recording and rec_writer:
                    elapsed = time.time() - rec_start_time
                    rec_writer.writerow([f"{elapsed:.4f}", v1, v2, v3])
                    rec_sample_count += 1

            except Exception:
                pass

        # --- Actual sample rate ---
        if time.time() - last_rate_check >= 1.0:
            actual_rate    = sample_counter
            sample_counter = 0
            last_rate_check = time.time()

        # --- Plot update ---
        if time.time() - last_plot >= 1 / PLOT_FPS:
            blink_on = not blink_on

            d1 = preprocess(buf_ch1)
            d2 = preprocess(buf_ch2)
            d3 = preprocess(buf_ch3)

            line1.set_ydata(d1)
            line2.set_ydata(d2)
            line3.set_ydata(d3)

            # Dynamic y-limits
            for ax, data in zip([ax1, ax2, ax3], [d1, d2, d3]):
                peak = np.max(np.abs(data))
                ylim = max(60, peak * 1.25)
                ax.set_ylim(-ylim, ylim)

            # --- Warning state ---
            peak_all = max(np.max(np.abs(d1)),
                           np.max(np.abs(d2)),
                           np.max(np.abs(d3)))
            warn_state = get_warn_state(peak_all)

            if warn_state == "RED":
                warn_box.set_facecolor('#3a0000')
                warn_label.set_text("⚠  HIGH AMPLITUDE!")
                warn_label.set_color('#ff4444')
                fig.patch.set_facecolor('#180000' if blink_on else '#0d0d0d')
            elif warn_state == "YELLOW":
                warn_box.set_facecolor('#2a2000')
                warn_label.set_text("◆  CAUTION: >80µV")
                warn_label.set_color('#ffcc00')
                fig.patch.set_facecolor('#0d0d0d')
            else:
                warn_box.set_facecolor('#001a0e')
                warn_label.set_text("● SIGNAL OK")
                warn_label.set_color('#00ff88')
                fig.patch.set_facecolor('#0d0d0d')

            # --- Signal status ---
            no_data = (time.time() - last_data_time > 2)
            if no_data:
                sig_dot.set_color('red')
                sig_label.set_text("NO DATA  ")
                sig_label.set_color('red')
            else:
                sig_dot.set_color('#00ff88')
                sig_label.set_text("LIVE     ")
                sig_label.set_color('#00ff88')

            # --- Rate display ---
            rate_label.set_text(f"Rate: {actual_rate} Hz")

            # --- Recording indicator ---
            if recording:
                elapsed = time.time() - rec_start_time
                mins    = int(elapsed) // 60
                secs    = int(elapsed) % 60
                rec_dot.set_color('#ff3333' if blink_on else '#880000')
                rec_label.set_text("● REC")
                rec_label.set_color('#ff5555')
                rec_timer.set_text(f"{mins:02d}:{secs:02d}  {rec_sample_count} pts")
            else:
                rec_dot.set_color('#333')
                rec_label.set_text("NOT RECORDING")
                rec_label.set_color('#555')
                rec_timer.set_text("")

            fig.canvas.draw_idle()
            fig.canvas.flush_events()
            last_plot = time.time()

        time.sleep(0.001)

except KeyboardInterrupt:
    print("\nStopped by user.")

finally:
    if recording:
        stop_recording()
    ser.close()
    plt.close('all')
    print("Clean exit.")