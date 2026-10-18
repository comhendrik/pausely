import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CalendarDays, Footprints, TrendingUp } from "lucide-react";
import scoreService from "../services/ScoreService";
import storageService from "../services/StorageService";
import activityService from "../services/ActivityService";
import type { DailyScore } from "../types/Activity";
import type { WorkSession } from "../types/Activity";
import workSessionService from "../services/WorkSessionService";
import { localDateKey } from "../types/Activity";

export default function HistoryPage() {
  const [history, setHistory] = useState<DailyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const activeWorkSession = useSyncExternalStore(
    workSessionService.subscribe,
    workSessionService.getSnapshot,
    workSessionService.getSnapshot,
  );
  const previousWorkSessionId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        await storageService.initialize();
        const result = await scoreService.getHistory(7);
        const work = storageService.getData().workSessions;

        if (active) { setHistory(result); setWorkSessions(work); }
      } catch (error) {
        console.error("Verlauf konnte nicht geladen werden:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const unsubscribe = activityService.subscribe(() => {
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const previousId = previousWorkSessionId.current;
    const currentId = activeWorkSession?.id ?? null;
    previousWorkSessionId.current = currentId;
    if (previousId && !currentId) {
      let active = true;
      void storageService.initialize().then(() => {
        if (active) setWorkSessions(storageService.getData().workSessions);
      });
      return () => { active = false; };
    }
  }, [activeWorkSession]);

  const today = history[history.length - 1];
  const scoresByDate = new Map(history.map((day) => [day.date, day.score]));
  for (const session of workSessions) {
    const date = localDateKey(new Date(session.endedAt));
    if (scoresByDate.has(date)) {
      scoresByDate.set(date, (scoresByDate.get(date) ?? 0) + session.score);
    }
  }
  if (activeWorkSession) {
    const date = localDateKey();
    if (scoresByDate.has(date)) {
      scoresByDate.set(date, (scoresByDate.get(date) ?? 0) + activeWorkSession.score);
    }
  }
  const weeklyStands = history.reduce(
    (sum, day) => sum + day.stands,
    0,
  );
  const maxStands = Math.max(1, ...history.map((day) => day.stands));

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(`${date}T12:00:00`));
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl p-6">Verlauf wird geladen …</main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 text-gray-900">
      <header>
        <h1 className="text-2xl font-semibold">Dein Verlauf</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sieh, wie regelmäßig du Bewegungspausen machst.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <article className="rounded-2xl border border-gray-100 p-4">
          <Footprints className="mb-3 text-blue-600" size={22} />
          <p className="text-3xl font-semibold">
            {today?.stands ?? 0}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Heute aufgestanden
          </p>
        </article>

        <article className="rounded-2xl border border-gray-100 p-4">
          <TrendingUp className="mb-3 text-green-600" size={22} />
          <p className="text-3xl font-semibold">{(today ? scoresByDate.get(today.date) ?? today.score : 0).toFixed(1)}</p>
          <p className="mt-1 text-sm text-gray-500">Punkte heute</p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-100 p-4">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-600" />
          <h2 className="font-semibold">Letzte 7 Tage</h2>
        </div>

        <div className="flex flex-col gap-4">
          {history.map((day) => (
            <div key={day.date} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-gray-500">
                {formatDate(day.date)}
              </span>

              <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${(day.stands / maxStands) * 100}%`,
                  }}
                />
              </div>

              <span className="w-6 text-right text-sm font-medium tabular-nums">
                {day.stands}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 p-4">
        <h2 className="mb-3 font-semibold">Worksession-Historie</h2>
        {workSessions.length === 0 ? <p className="text-sm text-gray-500">Noch keine Worksessions gespeichert.</p> : <div className="flex flex-col divide-y divide-gray-100">
          {[...workSessions].reverse().map((session) => <article key={session.id} className="py-3">
            <div className="flex items-center justify-between"><p className="font-medium">{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.startedAt))}</p><p className="font-semibold">{session.score.toFixed(2)} Punkte</p></div>
            <p className="mt-1 text-xs text-gray-500">Dauer {Math.floor(session.durationSeconds / 60)} Min · Sitzen {Math.floor(session.sittingSeconds / 60)} Min · Stehen {Math.floor(session.standingSeconds / 60)} Min · {session.switches} Wechsel{session.interrupted ? " · Unterbrochen" : ""}</p>
          </article>)}
        </div>}
      </section>

      <section className="rounded-2xl border border-gray-100 p-4">
        <h2 className="mb-4 font-semibold">Tagesübersicht</h2>

        <div className="flex flex-col divide-y divide-gray-100">
          {[...history].reverse().map((day) => (
            <div
              key={day.date}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-medium">{formatDate(day.date)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {day.stands} Aufsteh-Ereignisse · {day.skips} übersprungen
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold">{(scoresByDate.get(day.date) ?? day.score).toFixed(1)} Punkte</p>
                <p className="text-xs text-gray-500">Tages-Score</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-gray-50 p-3">
          <p className="text-sm text-gray-500">Aufgestanden in 7 Tagen</p>
          <p className="mt-1 text-2xl font-semibold">{weeklyStands}</p>
        </div>
      </section>
    </main>
  );
}
