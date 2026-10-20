import { useEffect, useState, useSyncExternalStore } from "react";
import { Play, Pause, RotateCcw, Minus, Plus, Armchair, PersonStanding, Footprints } from "lucide-react";
import { useTimer } from "../context/TimerContext";
import ActivityConfirmation from "../components/ActivityConfirmation";
import workSessionService from "../services/WorkSessionService";
import storageService from "../services/StorageService";

export default function TimerPage() {
  const {
    remaining,
    duration,
    isRunning,
    start,
    pause,
    reset,
    setDuration,
    adjustMinutes,
  } = useTimer();
  const workSession = useSyncExternalStore(workSessionService.subscribe, workSessionService.getSnapshot, workSessionService.getSnapshot);
  const [quickDurations, setQuickDurations] = useState<[number, number, number]>([15, 30, 60]);
  const [adjustmentStep, setAdjustmentStep] = useState<1 | 5 | 10>(1);

  useEffect(() => {
    let active = true;
    storageService.initialize().then((data) => {
      if (active) {
        setQuickDurations(data.settings.timerShortcuts);
        setAdjustmentStep(data.settings.timerAdjustmentStep);
      }
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60,
    ).padStart(2, "0")}`;

  function changeMinutes(delta: number) {
    if (isRunning) {
      adjustMinutes(delta);
    } else {
      const next = Math.min(180, Math.max(1, Math.floor(duration / 60) + delta));
      setDuration(next);
    }
  }

  function toggleTimer() {
    if (isRunning) {
      pause();
    } else {
      // Der Erinnerungstimer läuft unabhängig vom Sitz-/Stehmodus. Nur beim
      // erstmaligen Start einer Worksession gilt deren Standardsitzmodus.
      void workSessionService.start();
      if (remaining <= 0) {
        setDuration(Math.floor(duration / 60));
      }

      start();
    }
  }

  function resetTimer() {
    reset();
  }

  function selectQuickDuration(minutes: number) {
    if (!isRunning) {
      setDuration(minutes);
    }
  }

  function cycleAdjustmentStep() {
    const next = adjustmentStep === 1 ? 5 : adjustmentStep === 5 ? 10 : 1;
    setAdjustmentStep(next);
    const settings = storageService.getData().settings;
    void storageService.updateSettings({ ...settings, timerAdjustmentStep: next }).catch(console.error);
  }

  return (
    <main className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4 py-8 text-gray-900">
      <div className="pointer-events-none absolute inset-x-4 top-4 z-30">
        <ActivityConfirmation />
      </div>

      <div className={`w-full rounded-3xl border p-5 text-center transition-colors ${workSession?.mode === "standing" ? "border-green-200 bg-green-50" : workSession ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${workSession?.mode === "standing" ? "bg-green-100 text-green-800" : workSession ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-700"}`}>
            {workSession?.mode === "standing" ? <PersonStanding size={18}/> : <Armchair size={18}/>}
            {workSession ? (workSession.mode === "standing" ? "Standing" : "Sitting") : "Keine Worksession aktiv"}
          </div>
          {workSession && <button type="button" onClick={() => void workSessionService.switchMode(workSession.mode === "sitting" ? "standing" : "sitting")} aria-label={`Zu ${workSession.mode === "sitting" ? "Standing" : "Sitting"} wechseln`} title={`Zu ${workSession.mode === "sitting" ? "Standing" : "Sitting"} wechseln`} className="rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-sm hover:bg-gray-100">
            {workSession.mode === "sitting" ? <PersonStanding size={17}/> : <Armchair size={17}/>}
          </button>}
          <button
            type="button"
            onClick={cycleAdjustmentStep}
            aria-label={`Änderungsschritt: ${adjustmentStep} Minuten. Zum Wechseln anklicken`}
            title={`Änderungsschritt: ${adjustmentStep} Minuten (anklicken zum Wechseln)`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
          >
            <Footprints size={14} aria-hidden="true" />
            <span>{adjustmentStep}</span>
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 py-3">
          <button type="button" onClick={() => changeMinutes(-adjustmentStep)} disabled={(isRunning ? remaining : duration) <= adjustmentStep * 60} aria-label={`Zeit um ${adjustmentStep} Minuten verringern`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30"><Minus size={18} /></button>
          <div className="text-7xl font-light tracking-tight tabular-nums" role="timer" aria-label={`${Math.floor(remaining / 60)} Minuten ${remaining % 60} Sekunden`}>
            {formatTime(remaining)}
          </div>
          <button type="button" onClick={() => changeMinutes(adjustmentStep)} disabled={Math.floor((isRunning ? remaining : duration) / 60) + adjustmentStep > 180} aria-label={`Zeit um ${adjustmentStep} Minuten erhöhen`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30"><Plus size={18} /></button>
        </div>
        <p className="text-xs text-gray-500">Allgemeiner Erinnerungs-Timer · läuft unabhängig vom Modus</p>
      </div>

      <div className="flex w-full gap-2" aria-label="Schnellauswahl für die Dauer">
        {quickDurations.map((minutes, index) => (
          <button
            key={index}
            type="button"
            onClick={() => selectQuickDuration(minutes)}
            disabled={isRunning}
            aria-pressed={duration === minutes * 60}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${duration === minutes * 60 ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {minutes} Min
          </button>
        ))}
      </div>

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

    </main>
  );
}
