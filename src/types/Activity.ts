export type ActivityOutcome = "stood_up" | "skipped";

export interface ActivitySession {
  id: string;
  date: string; // YYYY-MM-DD
  completedAt: string;
  durationSeconds: number;
  outcome: ActivityOutcome | "pending";
  sittingPenaltyApplied: number;
}

export interface DailyScore {
  date: string;
  stands: number;
  skips: number;
  score: number;
}

export type WorkMode = "sitting" | "standing";
export interface WorkSession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  sittingSeconds: number;
  standingSeconds: number;
  switches: number;
  score: number;
  interrupted: boolean;
}
export interface ActiveWorkSession {
  id: string;
  startedAt: string;
  mode: WorkMode;
  modeStartedAt: number;
  elapsedSeconds: number;
  sittingSeconds: number;
  standingSeconds: number;
  switches: number;
  score: number;
  paused: boolean;
}

export type StorageMode = "local" | "supabase" | "custom";

export interface StorageSettings {
  mode: StorageMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
  customEndpoint: string;
  customToken: string;
}

export interface AppSettings {
  sittingPenaltyAfterMinutes: number;
  sittingPenaltyPerMinute: number;
  standUpPoints: number;
  skipPenalty: number;
  timerShortcuts: [number, number, number];
  timerAdjustmentStep: 1 | 5 | 10;
  storage: StorageSettings;
}

export interface AppData {
  version: 1;
  sessions: ActivitySession[];
  workSessions: WorkSession[];
  activeWorkSession: ActiveWorkSession | null;
  settings: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sittingPenaltyAfterMinutes: 30,
  sittingPenaltyPerMinute: 0.5,
  standUpPoints: 10,
  skipPenalty: 5,
  timerShortcuts: [15, 30, 60],
  timerAdjustmentStep: 1,
  storage: {
    mode: "local",
    supabaseUrl: "",
    supabaseAnonKey: "",
    userId: "",
    customEndpoint: "",
    customToken: "",
  },
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
