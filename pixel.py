import pyautogui
import time

try:
    while True:
        x, y = pyautogui.position()
        print(f"Mouse position: x={x}, y={y}")
        time.sleep(2)
except KeyboardInterrupt:
    print("Stopped.")