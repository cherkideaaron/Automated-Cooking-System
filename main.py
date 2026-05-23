import speech_recognition as sr
import pyautogui

# Set your click positions
UP_POSITION = (677, 328)     # change this
DOWN_POSITION = (693, 445)   # change this

recognizer = sr.Recognizer()

def listen_command():
    with sr.Microphone() as source:
        print("Listening...")
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        command = recognizer.recognize_google(audio).lower()
        print("You said:", command)
        return command
    except sr.UnknownValueError:
        print("Could not understand audio")
    except sr.RequestError:
        print("API error")
    return ""

while True:
    command = listen_command()

    if "up" in command:
        print("Clicking UP position")
        pyautogui.click(UP_POSITION)

    elif "down" in command:
        print("Clicking DOWN position")
        pyautogui.click(DOWN_POSITION)