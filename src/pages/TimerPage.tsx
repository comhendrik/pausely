import { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";
import { useTimer } from "../context/TimerContext";
import NotificationTest from "../components/NotificationTest";
import ActivityConfirmation from "../components/ActivityConfirmation";

export default function TimerPage() {
  const {
    remaining,
    isRunning,
    start,
    pause,
    reset,
    setDuration,
  } = useTimer();

  const [minutes, setMinutes] = useState(5);

  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60,
    ).padStart(2, "0")}`;

  function changeMinutes(value: number) {
    const next = Math.min(180, Math.max(1, value));
    setMinutes(next);

    if (!isRunning) {
      setDuration(next);
    }
  }

  function toggleTimer() {
    if (isRunning) {
      pause();
    } else {
      if (remaining <= 0) {
        setDuration(minutes);
      }

      start();
    }
  }

  function resetTimer() {
    reset();
    setDuration(minutes);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4 py-8 text-gray-900">
      <div
        className="py-5 text-7xl font-light tracking-tight tabular-nums"
        role="timer"
        aria-label={`${Math.floor(remaining / 60)} Minuten ${remaining % 60} Sekunden`}
      >
        {formatTime(remaining)}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => changeMinutes(minutes - 1)}
          disabled={isRunning || minutes <= 1}
          aria-label="Zeit verringern"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
        >
          <Minus size={18} />
        </button>

        <div className="min-w-20 text-center">
          <div className="text-2xl font-medium tabular-nums">
            {minutes}
          </div>
          <div className="text-xs text-gray-500">Minuten</div>
        </div>

        <button
          type="button"
          onClick={() => changeMinutes(minutes + 1)}
          disabled={isRunning || minutes >= 180}
          aria-label="Zeit erhöhen"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
        >
          <Plus size={18} />
        </button>
      </div>

      <NotificationTest />

      <button
        type="button"
        onClick={toggleTimer}
        className="flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98]"
      >
        {isRunning ? <Pause size={18} /> : <Play size={18} />}
        {isRunning
          ? "Pause"
          : remaining === 0
            ? "Erneut starten"
            : "Starten"}
      </button>

      <button
        type="button"
        onClick={resetTimer}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <RotateCcw size={14} />
        Zurücksetzen
      </button>

      <div className="w-full pt-2">
        <ActivityConfirmation />
      </div>
    </main>
  );
}