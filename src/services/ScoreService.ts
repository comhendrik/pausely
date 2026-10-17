import type {
  ActivityOutcome,
  ActivitySession,
  DailyScore,
} from "../types/Activity";
import { localDateKey } from "../types/Activity";
import storageService from "./StorageService";

class ScoreService {
  async getDailyScore(date = localDateKey()): Promise<DailyScore> {
    await storageService.initialize();

    const data = storageService.getData();
    const settings = data.settings;

    const sessions = data.sessions.filter(
      (session) =>
        session.date === date &&
        session.outcome !== "pending",
    );

    const stands = sessions.filter(
      (session) => session.outcome === "stood_up",
    ).length;

    const skips = sessions.filter(
      (session) => session.outcome === "skipped",
    ).length;

    const penalty = sessions.reduce(
      (total, session) => total + session.sittingPenaltyApplied,
      0,
    );

    return {
      date,
      stands,
      skips,
      score: Math.max(
        0,
        stands * settings.standUpPoints -
          skips * settings.skipPenalty -
          penalty,
      ),
    };
  }

  async getHistory(days = 7): Promise<DailyScore[]> {
    await storageService.initialize();

    const result: DailyScore[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      result.push(
        await this.getDailyScore(localDateKey(date)),
      );
    }

    return result;
  }

  async recordOutcome(
    sessionId: string,
    outcome: ActivityOutcome,
  ): Promise<void> {
    await storageService.update((data) => {
      const session = data.sessions.find(
        (item) => item.id === sessionId,
      );

      if (!session || session.outcome !== "pending") {
        return data;
      }

      session.outcome = outcome;
      return data;
    });
  }

  async calculateSittingPenalty(
    durationSeconds: number,
  ): Promise<number> {
    await storageService.initialize();

    const settings = storageService.getData().settings;
    const minutes = durationSeconds / 60;

    return Math.max(
      0,
      Math.floor(
        Math.max(
          0,
          minutes - settings.sittingPenaltyAfterMinutes,
        ) * settings.sittingPenaltyPerMinute,
      ),
    );
  }

  async getSession(
    id: string,
  ): Promise<ActivitySession | undefined> {
    await storageService.initialize();

    return storageService
      .getData()
      .sessions.find((session) => session.id === id);
  }
}

const scoreService = new ScoreService();

export default scoreService;