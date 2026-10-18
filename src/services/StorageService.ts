import type {
  AppData,
  AppSettings,
} from "../types/Activity";
import { DEFAULT_SETTINGS } from "../types/Activity";
import { LocalStorageProvider } from "../storage/LocalStorageProvider";
import { SupabaseStorageProvider } from "../storage/SupabaseStorageProvider";
import { CustomStorageProvider } from "../storage/CustomStorageProvider";
import type { StorageProvider } from "../storage/StorageProvider";

const localProvider = new LocalStorageProvider();

function createDefaultData(): AppData {
  return {
    version: 1,
    sessions: [],
    workSessions: [],
    activeWorkSession: null,
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

function mergeData(data: AppData | null): AppData {
  const defaults = createDefaultData();

  if (!data || data.version !== 1 || !Array.isArray(data.sessions)) {
    return defaults;
  }

  return {
    ...defaults,
    ...data,
    workSessions: Array.isArray(data.workSessions) ? data.workSessions : [],
    activeWorkSession: data.activeWorkSession ?? null,
    settings: {
      ...defaults.settings,
      ...data.settings,
      storage: {
        ...defaults.settings.storage,
        ...data.settings?.storage,
      },
    },
  };
}

class StorageService {
  private data: AppData = createDefaultData();
  private initialized = false;
  private queue: Promise<unknown> = Promise.resolve();

  private getRemoteProvider(
    settings: AppSettings = this.data.settings,
  ): StorageProvider | null {
    const storage = settings.storage;

    if (storage.mode === "supabase") {
      return new SupabaseStorageProvider({
        url: storage.supabaseUrl,
        anonKey: storage.supabaseAnonKey,
        userId: storage.userId,
      });
    }

    if (storage.mode === "custom") {
      return new CustomStorageProvider(
        storage.customEndpoint,
        storage.customToken,
      );
    }

    return null;
  }

  async initialize(): Promise<AppData> {
    if (this.initialized) return this.getData();

    const stored = await localProvider.load();
    const local = mergeData(stored);
    if (stored?.activeWorkSession) {
      const active = stored.activeWorkSession;
      const now = Date.now();
      const lastModeSeconds = active.paused
        ? 0
        : Math.max(0, Math.floor((now - active.modeStartedAt) / 1000));
      const sittingSeconds = active.sittingSeconds + (active.mode === "sitting" ? lastModeSeconds : 0);
      const standingSeconds = active.standingSeconds + (active.mode === "standing" ? lastModeSeconds : 0);
      const endedAt = new Date(now).toISOString();
      const settings = local.settings;
      const score = Math.round(((standingSeconds / 60 * settings.standUpPoints) -
        (Math.max(0, sittingSeconds / 60 - settings.sittingPenaltyAfterMinutes) * settings.sittingPenaltyPerMinute)) * 100) / 100;
      if (score > 0) local.workSessions.push({
        id: active.id, startedAt: active.startedAt, endedAt,
        durationSeconds: active.elapsedSeconds + lastModeSeconds,
        sittingSeconds, standingSeconds, switches: active.switches,
        score, interrupted: true,
      });
      await localProvider.save(local);
    }

    this.data = local;
    this.initialized = true;

    const remote = this.getRemoteProvider();

    if (remote) {
      try {
        const remoteData = await remote.load();

        if (remoteData) {
          this.data = mergeData(remoteData);
          await localProvider.save(this.data);
        } else {
          await remote.save(this.data);
        }
      } catch (error) {
        console.error("Cloud-Synchronisierung fehlgeschlagen:", error);
      }
    }

    return this.getData();
  }

  getData(): AppData {
    return structuredClone(this.data);
  }

  async update(
    updater: (current: AppData) => AppData,
  ): Promise<AppData> {
    const operation = this.queue.then(async () => {
      await this.initialize();

      this.data = mergeData(updater(this.getData()));

      // Lokale Speicherung hat immer Vorrang.
      await localProvider.save(this.data);

      const remote = this.getRemoteProvider();

      if (remote) {
        await remote.save(this.data);
      }

      return this.getData();
    });

    this.queue = operation.catch(() => undefined);

    return operation;
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    await this.update((current) => ({
      ...current,
      settings: {
        ...settings,
        storage: { ...settings.storage },
      },
    }));

    // Bei einem Providerwechsel die bestehenden Daten hochladen.
    const remote = this.getRemoteProvider(settings);

    if (remote) {
      await remote.save(this.getData());
    }
  }

  async exportData(): Promise<string> {
    await this.initialize();
    return JSON.stringify(this.getData(), null, 2);
  }

  async importData(json: string): Promise<void> {
    const imported = mergeData(JSON.parse(json) as AppData);

    await this.update(() => imported);
  }
}

const storageService = new StorageService();

export default storageService;
