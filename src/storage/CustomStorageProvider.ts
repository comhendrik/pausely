import type { AppData } from "../types/Activity";
import type { StorageProvider } from "./StorageProvider";

export class CustomStorageProvider implements StorageProvider {
  constructor(
    private endpoint: string,
    private token: string,
  ) {}

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      ...(this.token
        ? { Authorization: `Bearer ${this.token}` }
        : {}),
    };
  }

  async load(): Promise<AppData | null> {
    if (!this.endpoint) {
      throw new Error("Die Cloud-URL fehlt.");
    }

    const response = await fetch(this.endpoint, {
      method: "GET",
      headers: this.headers(),
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`Cloud-Ladefehler: ${response.status}`);
    }

    return (await response.json()) as AppData;
  }

  async save(data: AppData): Promise<void> {
    if (!this.endpoint) {
      throw new Error("Die Cloud-URL fehlt.");
    }

    const response = await fetch(this.endpoint, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Cloud-Speicherfehler: ${response.status}`);
    }
  }
}