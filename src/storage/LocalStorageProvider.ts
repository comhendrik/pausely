import type { AppData } from "../types/Activity";
import type { StorageProvider } from "./StorageProvider";

const STORAGE_KEY = "standup-app-data-v1";

export class LocalStorageProvider implements StorageProvider {
  async load(): Promise<AppData | null> {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    try {
      const data = JSON.parse(raw) as AppData;

      if (data.version !== 1 || !Array.isArray(data.sessions)) {
        throw new Error("Ungültiges Datenformat.");
      }

      return data;
    } catch {
      throw new Error(
        "Die lokal gespeicherten Daten konnten nicht gelesen werden.",
      );
    }
  }

  async save(data: AppData): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}