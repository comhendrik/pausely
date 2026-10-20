import { useEffect, useState } from "react";
import { Save, Cloud, HardDrive } from "lucide-react";
import storageService from "../services/StorageService";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
} from "../types/Activity";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(
    structuredClone(DEFAULT_SETTINGS),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    storageService
      .initialize()
      .then((data) => {
        if (active) setSettings(data.settings);
      })
      .catch((error) => {
        console.error(error);
        if (active) setMessage("Einstellungen konnten nicht geladen werden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateStorage(
    key: keyof AppSettings["storage"],
    value: string,
  ) {
    setSettings((current) => ({
      ...current,
      storage: {
        ...current.storage,
        [key]: value,
      },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      await storageService.updateSettings(settings);
      setMessage("Einstellungen wurden gespeichert.");
    } catch (error) {
      console.error(error);
      setMessage(
        "Lokal gespeichert, aber die Cloud-Synchronisierung ist fehlgeschlagen. Prüfe deine Zugangsdaten.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl p-6">Einstellungen werden geladen …</main>;
  }

  const fieldClass =
    "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 text-gray-900">
      <header>
        <h1 className="text-2xl font-semibold">Einstellungen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Passe deinen Tages-Score und deine Datenspeicherung an.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-100 p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Timer-Schnellwahl</h2>
          <p className="mt-1 text-sm text-gray-500">Lege die drei Minutenwerte für die Schnellwahl im Timer fest (1 bis 180 Minuten).</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {settings.timerShortcuts.map((minutes, index) => (
            <label key={index} className="text-sm">
              Schnellwahl {index + 1} (Minuten)
              <input
                className={fieldClass}
                type="number"
                min="1"
                max="180"
                step="1"
                value={minutes}
                onChange={(event) => {
                  const next = [...settings.timerShortcuts] as [number, number, number];
                  next[index] = Math.min(180, Math.max(1, Math.floor(Number(event.target.value) || 1)));
                  update("timerShortcuts", next);
                }}
              />
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm">
          Änderungsschritt für Plus/Minus
          <select
            className={fieldClass}
            value={settings.timerAdjustmentStep}
            onChange={(event) => update("timerAdjustmentStep", Number(event.target.value) as 1 | 5 | 10)}
          >
            <option value={1}>1 Minute</option>
            <option value={5}>5 Minuten</option>
            <option value={10}>10 Minuten</option>
          </select>
          <span className="mt-1 block text-xs text-gray-500">Der runde Steps-Button im Timer wechselt weiterhin zwischen diesen Schrittweiten.</span>
        </label>
      </section>

      <section className="rounded-2xl border border-gray-100 p-5">
        <div className="mb-4 flex items-center gap-2">
          <HardDrive size={20} className="text-blue-600" />
          <h2 className="font-semibold">Score-Regeln</h2>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm">
            Punkte pro bestätigtem Aufstehen
            <input
              className={fieldClass}
              type="number"
              min="0"
              value={settings.standUpPoints}
              onChange={(e) =>
                update("standUpPoints", Math.max(0, Number(e.target.value)))
              }
            />
          </label>

          <label className="text-sm">
            Punktabzug pro Skip
            <input
              className={fieldClass}
              type="number"
              min="0"
              value={settings.skipPenalty}
              onChange={(e) =>
                update("skipPenalty", Math.max(0, Number(e.target.value)))
              }
            />
          </label>

          <label className="text-sm">
            Sitzdauer bis zum zusätzlichen Punktabzug (Minuten)
            <input
              className={fieldClass}
              type="number"
              min="0"
              value={settings.sittingPenaltyAfterMinutes}
              onChange={(e) =>
                update(
                  "sittingPenaltyAfterMinutes",
                  Math.max(0, Number(e.target.value)),
                )
              }
            />
          </label>

          <label className="text-sm">
            Punktabzug pro zusätzlicher Sitzminute
            <input
              className={fieldClass}
              type="number"
              min="0"
              step="0.5"
              value={settings.sittingPenaltyPerMinute}
              onChange={(e) =>
                update(
                  "sittingPenaltyPerMinute",
                  Math.max(0, Number(e.target.value)),
                )
              }
            />
          </label>

          <p className="text-xs text-gray-500">
            Der Tages-Score kann nicht unter 0 fallen. Änderungen an den
            Regeln wirken sich auf die berechneten Tages-Scores aus.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Cloud size={20} className="text-blue-600" />
          <h2 className="font-semibold">Datenspeicherung</h2>
        </div>

        <label className="text-sm">
          Speicherort
          <select
            className={fieldClass}
            value={settings.storage.mode}
            onChange={(e) =>
              update("storage", {
                ...settings.storage,
                mode: e.target.value as AppSettings["storage"]["mode"],
              })
            }
          >
            <option value="local">Nur lokal auf diesem Gerät</option>
            <option value="supabase">Supabase</option>
            <option value="custom">Eigener Cloud-Storage (REST API)</option>
          </select>
        </label>

        {settings.storage.mode === "local" && (
          <p className="mt-3 text-sm text-gray-500">
            Deine Daten werden im Browser gespeichert. Browserdaten löschen
            oder ein Gerätewechsel kann zum Verlust der lokalen Daten führen.
          </p>
        )}

        {settings.storage.mode === "supabase" && (
          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm">
              Supabase Project URL
              <input
                className={fieldClass}
                type="url"
                placeholder="https://your-project.supabase.co"
                value={settings.storage.supabaseUrl}
                onChange={(e) =>
                  updateStorage("supabaseUrl", e.target.value)
                }
              />
            </label>

            <label className="text-sm">
              Supabase Publishable Key / Anon Key
              <input
                className={fieldClass}
                type="password"
                autoComplete="off"
                value={settings.storage.supabaseAnonKey}
                onChange={(e) =>
                  updateStorage("supabaseAnonKey", e.target.value)
                }
              />
            </label>

            <label className="text-sm">
              Benutzer-ID (UUID)
              <input
                className={fieldClass}
                value={settings.storage.userId}
                onChange={(e) =>
                  updateStorage("userId", e.target.value)
                }
              />
            </label>

            <p className="text-xs text-gray-500">
              Verwende niemals einen Supabase-Service-Role-Key im Browser.
              Für echte Benutzerkonten sollte die ID aus der Supabase-Session
              kommen.
            </p>
          </div>
        )}

        {settings.storage.mode === "custom" && (
          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm">
              API-Endpunkt
              <input
                className={fieldClass}
                type="url"
                placeholder="https://example.com/api/app-data"
                value={settings.storage.customEndpoint}
                onChange={(e) =>
                  updateStorage("customEndpoint", e.target.value)
                }
              />
            </label>

            <label className="text-sm">
              API-Token (optional)
              <input
                className={fieldClass}
                type="password"
                autoComplete="off"
                value={settings.storage.customToken}
                onChange={(e) =>
                  updateStorage("customToken", e.target.value)
                }
              />
            </label>

            <p className="text-xs text-gray-500">
              Der Endpunkt muss JSON über GET zurückgeben und JSON über PUT
              speichern. Der Server muss CORS unterstützen. Zugangsdaten im
              Browser sind nicht vollständig vor Zugriff geschützt.
            </p>
          </div>
        )}
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => void saveSettings()}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Save size={18} />
        {saving ? "Speichert …" : "Einstellungen speichern"}
      </button>

      {message && (
        <p role="status" className="text-sm text-gray-600">
          {message}
        </p>
      )}
    </main>
  );
}
