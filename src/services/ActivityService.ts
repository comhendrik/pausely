import type { ActivitySession } from "../types/Activity";
import { localDateKey } from "../types/Activity";
import storageService from "./StorageService";
import scoreService from "./ScoreService";

type Listener = () => void;

class ActivityService {
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  async getPending(): Promise<ActivitySession | null> {
    await storageService.initialize();

    const pending = storageService
      .getData()
      .sessions
      .filter((session) => session.outcome === "pending");

    return pending[pending.length - 1] ?? null;
  }

  async createPendingSession(
    durationSeconds: number,
  ): Promise<ActivitySession> {
    await storageService.initialize();

    const data = storageService.getData();
    const lastStand = data.sessions
      .filter((session) => session.outcome === "stood_up")
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() -
          new Date(a.completedAt).getTime(),
      )[0];

    const now = new Date();

    // Sitzzeit seit dem letzten bestätigten Aufstehen.
    const sittingSeconds = lastStand
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() -
              new Date(lastStand.completedAt).getTime()) /
              1000,
          ),
        )
      : durationSeconds;

    const sittingPenalty =
      await scoreService.calculateSittingPenalty(sittingSeconds);

    const session: ActivitySession = {
      id: crypto.randomUUID(),
      date: localDateKey(now),
      completedAt: now.toISOString(),
      durationSeconds: sittingSeconds,
      outcome: "pending",
      sittingPenaltyApplied: sittingPenalty,
    };

    await storageService.update((current) => ({
      ...current,
      sessions: [...current.sessions, session],
    }));

    this.notify();

    return session;
  }

  async confirmStandUp(id: string): Promise<void> {
    await scoreService.recordOutcome(id, "stood_up");
    this.notify();
  }

  async skip(id: string): Promise<void> {
    await scoreService.recordOutcome(id, "skipped");
    this.notify();
  }

  async getSessions(): Promise<ActivitySession[]> {
    await storageService.initialize();

    return storageService
      .getData()
      .sessions
      .filter((session) => session.outcome !== "pending")
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() -
          new Date(a.completedAt).getTime(),
      );
  }
}

const activityService = new ActivityService();

export default activityService;