
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

class NotificationService {
  public async sendNotification(message: string): Promise<void> {
    let permissionGranted = await isPermissionGranted();

    console.log("Aktuelle Berechtigung:", permissionGranted);

    if (!permissionGranted) {
      const permission = await requestPermission();
      console.log("Antwort auf Berechtigungsanfrage:", permission);
      permissionGranted = permission === "granted";
    }

    if (!permissionGranted) {
      throw new Error("Benachrichtigungsberechtigung wurde nicht erteilt.");
    }

    await sendNotification({
      title: "Tauri Test",
      body: message,
    });

    console.log("sendNotification() wurde ausgeführt.");
  }
}

const notificationService = new NotificationService();
export default notificationService;
