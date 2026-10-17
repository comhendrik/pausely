
import { useState } from "react";
import notificationService from "../services/NotificationService";

export default function NotificationTest() {
  const [status, setStatus] = useState("Noch kein Test ausgeführt.");
  const [loading, setLoading] = useState(false);

  async function testNotification() {
    setLoading(true);
    setStatus("Sende Testbenachrichtigung ...");

    try {
      await notificationService.sendNotification(
        "Wenn du diese Nachricht siehst, funktioniert der Test!"
      );

      setStatus(
        "Aufruf erfolgreich. Prüfe, ob die Benachrichtigung sichtbar war."
      );
    } catch (error) {
      console.error("Notification-Test fehlgeschlagen:", error);
      setStatus(`Fehler: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-5">
      <button
        type="button"
        onClick={testNotification}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Teste ..." : "Testbenachrichtigung senden"}
      </button>

      <p className="max-w-sm text-center text-sm text-gray-600" role="status">
        {status}
      </p>
    </div>
  );
}
