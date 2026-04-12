import socket
import json
import time
import random

HOST = "127.0.0.1"
PORT = 9000

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect((HOST, PORT))

print("Connected to backend. Sending simulated EEG...")

while True:
    packet = {
        "ts": int(time.time() * 1000),
        "ch1": random.uniform(-50, 50),
        "ch2": random.uniform(-50, 50),
        "ch3": random.uniform(-50, 50),
        "mode": "live",        #"mode": "train",
        "label": "yes"
    }

    client.send((json.dumps(packet) + "\n").encode())
    time.sleep(1/250)
