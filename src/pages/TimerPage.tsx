import { useEffect, useRef, useState } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { ButtonWrapper } from "../components/ButtonWrapper";

function Timer() {
  const [minutes, setMinutes] = useState(5);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("Timer ist nicht gestartet.");
  const [isApproved, setIsApproved] = useState(true);
  const standUpMinutes = 5;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  async function getNotificationPermission() {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    return permissionGranted;
  }

  async function startTimer() {

    if (!Number.isFinite(minutes) || minutes <= 0) {
      setMessage("Bitte eine Zeit größer als 0 Minuten eingeben.");
      return;
    }

    stopTimer(false);

    const durationInSeconds = Math.round(minutes * 60);

    setRemainingSeconds(durationInSeconds);
    setIsRunning(true);
    setMessage(`Timer läuft für ${minutes} Minute(n).`);

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current === null || current <= 1) {
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    timeoutRef.current = setTimeout(async () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      timeoutRef.current = null;
      setRemainingSeconds(0);
      setIsRunning(false);
      setIsApproved(false);
      setMessage("Timer ist abgelaufen, warte auf Bestätigung, um den nächsten Timer zu starten.");

      const permissionGranted = await getNotificationPermission();

      if (!permissionGranted) {
        setMessage(
          "Timer abgelaufen, aber keine Benachrichtigungsberechtigung vorhanden.",
        );
        return;
      }

      await sendNotification({
        title: "Timer abgelaufen",
        body: "Dein Timer ist abgelaufen.",
      });
    }, durationInSeconds * 1000);
  }

  async function approveStandUp() {

    setIsApproved(true);

    stopTimer(false);

    const durationInSeconds = Math.round(standUpMinutes * 60);

    setRemainingSeconds(durationInSeconds);
    setIsRunning(true);
    setMessage(`Timer läuft für ${minutes} Minute(n).`);

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current === null || current <= 1) {
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    timeoutRef.current = setTimeout(async () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      timeoutRef.current = null;
      setRemainingSeconds(0);
      setIsRunning(false);
      setMessage("Timer ist abgelaufen");

      const permissionGranted = await getNotificationPermission();

      if (!permissionGranted) {
        setMessage(
          "Timer abgelaufen, aber keine Benachrichtigungsberechtigung vorhanden.",
        );
        return;
      }

      await sendNotification({
        title: "Hinsetzen",
        body: "Dein Timer ist abgelaufen.",
      });
    }, durationInSeconds * 1000);
  }

  function stopTimer(updateMessage = true) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsRunning(false);
    setRemainingSeconds(null);

    if (updateMessage) {
      setMessage("Timer gestoppt.");
    }
  }

  function formatTime(seconds: number | null) {
    if (seconds === null) {
      return "--:--";
    }

    const minutesPart = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");

    const secondsPart = (seconds % 60).toString().padStart(2, "0");

    return `${minutesPart}:${secondsPart}`;
  }

  return (
    <main className="container">
      <h1>Timer</h1>

      <div className="timer-display" aria-live="polite">
        {formatTime(remainingSeconds)}
      </div>

      <form className="timer-form">
        <label htmlFor="minutes">Dauer in Minuten</label>

        <input
          id="minutes"
          type="number"
          min="1"
          step="1"
          value={minutes}
          disabled={isRunning}
          onChange={(event) => {
            setMinutes(Number(event.currentTarget.value));
          }}
        />

        <ButtonWrapper show={!isRunning && isApproved} type="button" onClick={() => startTimer()}>
            Timer starten
        </ButtonWrapper>

        <ButtonWrapper show={!isRunning && !isApproved} type="button" onClick={() => approveStandUp()}>
            Bestätige Aufstehen
        </ButtonWrapper>

        <ButtonWrapper show={isRunning && !isApproved} type="button" onClick={() => stopTimer()}>
            Stoppe Timer
        </ButtonWrapper>
      </form>

      <p>{message}</p>
    </main>
  );
}

export default Timer;
