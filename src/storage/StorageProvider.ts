import type { AppData } from "../types/Activity";

export interface StorageProvider {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
}