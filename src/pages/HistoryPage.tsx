import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CalendarDays, ChartNoAxesColumnIncreasing } from "lucide-react";
import scoreService from "../services/ScoreService";
import storageService from "../services/StorageService";
import activityService from "../services/ActivityService";
import type { DailyScore, WorkSession } from "../types/Activity";
import workSessionService from "../services/WorkSessionService";
import { localDateKey } from "../types/Activity";

type Period = "week" | "month" | "year";

const periodLabels: Record<Period, string> = {
  week: "Wöchentlich",
  month: "Monatlich",
  year: "Jährlich",
};

function dateAtOffset(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function dateRange(period: Period): Date[] {
  if (period === "week") return Array.from({ length: 7 }, (_, index) => dateAtOffset(index - 6));

  const now = new Date();
  if (period === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    return Array.from({ length: now.getDate() }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1, 12));
  }

  const first = new Date(now.getFullYear(), 0, 1, 12);
  const numberOfDays = Math.floor((now.getTime() - first.getTime()) / 86_400_000) + 1;
  return Array.from({ length: numberOfDays }, (_, index) => {
    const date = new Date(first);
    date.setDate(index + 1);
    return date;
  });
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);
}

function formatPoints(points: number) {
  return points.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [history, setHistory] = useState<DailyScore[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const activeWorkSession = useSyncExternalStore(
    workSessionService.subscribe,
    workSessionService.getSnapshot,
    workSessionService.getSnapshot,
  );

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await storageService.initialize();
        const [scores] = await Promise.all([scoreService.getHistory(366)]);
        if (!active) return;
        setHistory(scores);
        setWorkSessions(storageService.getData().workSessions);
      } catch (error) {
        console.error("Verlauf konnte nicht geladen werden:", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const unsubscribe = activityService.subscribe(() => { void load(); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const dailyScores = useMemo(() => {
    const scores = new Map(history.map((day) => [day.date, day.score]));
    for (const session of workSessions) {
      const date = localDateKey(new Date(session.endedAt));
      scores.set(date, (scores.get(date) ?? 0) + session.score);
    }
    if (activeWorkSession) {
      const date = localDateKey();
      scores.set(date, (scores.get(date) ?? 0) + activeWorkSession.score);
    }
    return scores;
  }, [history, workSessions, activeWorkSession]);

  const dates = useMemo(() => dateRange(period), [period]);
  const average = dates.length
    ? dates.reduce((sum, date) => sum + (dailyScores.get(localDateKey(date)) ?? 0), 0) / dates.length
    : 0;
  const maxDailyScore = Math.max(1, ...dates.map((date) => dailyScores.get(localDateKey(date)) ?? 0));

  const monthCalendar = useMemo(() => {
    const now = new Date();
    const firstDayOffset = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
    const cells: (Date | null)[] = [
      ...Array.from({ length: firstDayOffset }, () => null),
      ...Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1, 12)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  }, []);

  const monthlyAverages = useMemo(() => {
    const now = new Date();
    return Array.from({ length: now.getMonth() + 1 }, (_, month) => {
      const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate();
      const daysElapsed = month === now.getMonth() ? now.getDate() : daysInMonth;
      let points = 0;
      for (let day = 1; day <= daysElapsed; day++) {
        points += dailyScores.get(localDateKey(new Date(now.getFullYear(), month, day, 12))) ?? 0;
      }
      return {
        label: new Intl.DateTimeFormat("de-DE", { month: "short" }).format(new Date(now.getFullYear(), month, 1)),
        average: points / daysElapsed,
      };
    });
  }, [dailyScores]);

  if (loading) return <main className="mx-auto max-w-2xl p-6">Verlauf wird geladen …</main>;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 text-gray-900">
      <header>
        <h1 className="text-2xl font-semibold">Dein Verlauf</h1>
        <p className="mt-1 text-sm text-gray-500">Sieh deine durchschnittlichen Punkte im Zeitverlauf.</p>
      </header>

      <div role="tablist" aria-label="Zeitraum auswählen" className="flex w-full flex-row flex-nowrap rounded-xl bg-gray-100 p-1">
        {(Object.keys(periodLabels) as Period[]).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={period === key} onClick={() => setPeriod(key)} className={`min-w-0 flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-center text-sm font-medium transition-colors sm:px-3 ${period === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
            {periodLabels[key]}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-center gap-3">
          <ChartNoAxesColumnIncreasing className="text-blue-600" size={23} />
          <div>
            <p className="text-sm text-gray-500">Durchschnitt pro Tag</p>
            <p className="text-3xl font-semibold tabular-nums">{formatPoints(average)} <span className="text-base font-medium text-gray-500">Punkte</span></p>
          </div>
        </div>
      </section>

      {period === "week" && <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-600" />
          <h2 className="font-semibold">Letzte 7 Tage</h2>
        </div>
        <div className="flex flex-col gap-4">
          {dates.map((date) => {
            const points = dailyScores.get(localDateKey(date)) ?? 0;
            return <div key={localDateKey(date)} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-gray-500">{formatDay(date)}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(points / maxDailyScore) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-sm font-medium tabular-nums">{formatPoints(points)}</span>
            </div>;
          })}
        </div>
      </section>}

      {period === "month" && <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-600" />
          <h2 className="font-semibold">{new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date())}</h2>
        </div>
        <div className="flex flex-col gap-1 text-center">
          <div className="grid grid-cols-7 gap-1">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => <span key={day} className="pb-2 text-xs font-medium text-gray-500">{day}</span>)}
          </div>
          {monthCalendar.map((week, weekIndex) => <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
            {week.map((date, dayIndex) => {
              if (!date) return <span key={`empty-${weekIndex}-${dayIndex}`} className="min-h-14" aria-hidden="true" />;
              const points = dailyScores.get(localDateKey(date)) ?? 0;
              const intensity = Math.min(1, points / Math.max(1, maxDailyScore));
              return <div key={localDateKey(date)} title={`${formatDay(date)}: ${formatPoints(points)} Punkte`} className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-lg px-0.5 py-1 ${points > 0 ? "bg-blue-100" : "bg-gray-50"}`} style={points > 0 ? { backgroundColor: `rgba(37, 99, 235, ${0.08 + intensity * 0.2})` } : undefined}>
                <span className="text-xs text-gray-500">{date.getDate()}</span>
                <span className="mt-1 truncate text-[10px] font-semibold tabular-nums sm:text-xs">{formatPoints(points)}</span>
              </div>;
            })}
          </div>)}
        </div>
        <p className="mt-3 text-right text-xs text-gray-500">Punkte pro Tag</p>
      </section>}

      {period === "year" && <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-600" />
          <h2 className="font-semibold">Monatsdurchschnitt · {new Date().getFullYear()}</h2>
        </div>
        <div className="flex flex-col gap-4">
          {(() => {
            const maxMonthlyAverage = Math.max(1, ...monthlyAverages.map((item) => item.average));
            return monthlyAverages.map((month) => (
              <div key={month.label} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-sm capitalize text-gray-500">{month.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(month.average / maxMonthlyAverage) * 100}%` }} />
                </div>
                <span className="w-16 text-right text-sm font-medium tabular-nums">{formatPoints(month.average)}</span>
              </div>
            ));
          })()}
        </div>
      </section>}
    </main>
  );
}
