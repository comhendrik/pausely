import { useCallback, useEffect, useState } from "react";
import { Check, SkipForward } from "lucide-react";
import activityService from "../services/ActivityService";
import type { ActivitySession } from "../types/Activity";
import workSessionService from "../services/WorkSessionService";

export default function ActivityConfirmation() {
  const [pending, setPending] = useState<ActivitySession | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const session = await activityService.getPending();
    setPending(session);
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribe = activityService.subscribe(() => {
      void refresh();
    });

    return unsubscribe;
  }, [refresh]);

  async function choose(outcome: "stood_up" | "skipped") {
    if (!pending || saving) return;

    setSaving(true);

    try {
      if (outcome === "stood_up") {
        await activityService.confirmStandUp(pending.id);
        await workSessionService.startInMode("standing");
      } else {
        await activityService.skip(pending.id);
      }

      setPending(null);
      await refresh();
    } catch (error) {
      console.error("Aktivität konnte nicht gespeichert werden:", error);
    } finally {
      setSaving(false);
    }
  }

  if (!pending) return null;

  return (
    <section
      aria-labelledby="activity-confirmation-title"
      className="pointer-events-auto relative z-20 w-full rounded-2xl border border-blue-200 bg-blue-50 p-5 text-gray-900 shadow-lg"
    >
      <div className="mb-4">
        <h2
          id="activity-confirmation-title"
          className="text-lg font-semibold"
        >
          Zeit für eine Bewegungspause!
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Bist du aufgestanden? Bestätige deine Aktivität oder
          überspringe diese Erinnerung.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void choose("stood_up")}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Check size={18} />
          Ich bin aufgestanden (+ Punkte)
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void choose("skipped")}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <SkipForward size={18} />
          Überspringen
        </button>
      </div>
    </section>
  );
}
