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

    const local = mergeData(await localProvider.load());

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