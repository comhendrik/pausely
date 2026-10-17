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
  storage: StorageSettings;
}

export interface AppData {
  version: 1;
  sessions: ActivitySession[];
  settings: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sittingPenaltyAfterMinutes: 30,
  sittingPenaltyPerMinute: 0.5,
  standUpPoints: 10,
  skipPenalty: 5,
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