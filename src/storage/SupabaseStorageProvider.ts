import type { AppData } from "../types/Activity";
import type { StorageProvider } from "./StorageProvider";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  userId: string;
}

export class SupabaseStorageProvider implements StorageProvider {
  constructor(private config: SupabaseConfig) {}

  private get endpoint(): string {
    const { url, userId } = this.config;

    if (!url || !userId) {
      throw new Error("Supabase-URL und Benutzer-ID fehlen.");
    }

    return `${url.replace(/\/$/, "")}/rest/v1/user_app_state?user_id=eq.${encodeURIComponent(userId)}`;
  }

  private get headers(): HeadersInit {
    if (!this.config.anonKey) {
      throw new Error("Der Supabase-API-Key fehlt.");
    }

    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };
  }

  async load(): Promise<AppData | null> {
    const response = await fetch(
      `${this.endpoint}&select=data`,
      { headers: this.headers },
    );

    if (!response.ok) {
      throw new Error(`Supabase-Ladefehler: ${response.status}`);
    }

    const rows = (await response.json()) as Array<{ data: AppData }>;

    return rows[0]?.data ?? null;
  }

  async save(data: AppData): Promise<void> {
    const existing = await this.load();

    const response = await fetch(
      existing
        ? this.endpoint
        : `${this.config.url.replace(/\/$/, "")}/rest/v1/user_app_state`,
      {
        method: existing ? "PATCH" : "POST",
        headers: {
          ...this.headers,
          ...(existing ? {} : { Prefer: "return=minimal" }),
        },
        body: JSON.stringify(
          existing
            ? { data }
            : { user_id: this.config.userId, data },
        ),
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase-Speicherfehler: ${response.status}`);
    }
  }
}