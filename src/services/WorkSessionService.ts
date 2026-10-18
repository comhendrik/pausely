import type { ActiveWorkSession, WorkMode, WorkSession } from "../types/Activity";
import storageService from "./StorageService";

type Listener = () => void;
class WorkSessionService {
  private active: ActiveWorkSession | null = null;
  private listeners = new Set<Listener>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private ready: Promise<void>;

  constructor() {
    this.ready = storageService.initialize().then((data) => {
      // initialize() finalizes any session left by an earlier app process.
      this.active = data.activeWorkSession;
      this.notify();
    }).catch((error) => console.error("Worksession konnte nicht geladen werden:", error));
  }

  subscribe = (listener: Listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.active;
  private notify() { this.listeners.forEach((listener) => listener()); }
  private async persist() {
    await this.ready;
    await storageService.update((data) => ({ ...data, activeWorkSession: this.active }));
  }
  private beginTicks() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => { void this.flush(); }, 1000);
  }
  private stopTicks() { if (this.interval) clearInterval(this.interval); this.interval = null; }

  private async flush() {
    await this.ready;
    if (!this.active || this.active.paused) return;
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - this.active.modeStartedAt) / 1000));
    const data = storageService.getData();
    const sitting = this.active.sittingSeconds + (this.active.mode === "sitting" ? elapsed : 0);
    const standing = this.active.standingSeconds + (this.active.mode === "standing" ? elapsed : 0);
    const threshold = data.settings.sittingPenaltyAfterMinutes * 60;
    const penaltyRate = data.settings.sittingPenaltyPerMinute;
    const penalty = Math.max(0, sitting - threshold) / 60 * penaltyRate;
    const earned = standing / 60 * data.settings.standUpPoints;
    this.active = { ...this.active, elapsedSeconds: this.active.elapsedSeconds + elapsed,
      sittingSeconds: sitting, standingSeconds: standing, score: Math.round((earned - penalty) * 100) / 100,
      modeStartedAt: now };
    this.notify();
    await this.persist();
  }

  async start() {
    await this.ready;
    if (this.active) return;
    this.active = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), mode: "sitting",
      modeStartedAt: Date.now(), elapsedSeconds: 0, sittingSeconds: 0, standingSeconds: 0,
      switches: 0, score: 0, paused: false };
    this.beginTicks(); this.notify(); await this.persist();
  }
  async startInMode(mode: WorkMode) {
    await this.start();
    if (this.active?.paused) {
      this.active = { ...this.active, paused: false, modeStartedAt: Date.now() };
      this.beginTicks(); this.notify(); await this.persist();
    }
    if (this.active && this.active.mode !== mode) await this.switchMode(mode);
  }
  async switchMode(mode: WorkMode) {
    await this.flush();
    if (!this.active || this.active.paused || this.active.mode === mode) return;
    this.active = { ...this.active, mode, modeStartedAt: Date.now(), switches: this.active.switches + 1 };
    this.notify(); await this.persist();
  }
  async finish() {
    await this.flush(); if (!this.active) return;
    const active = this.active;
    const session: WorkSession = { id: active.id, startedAt: active.startedAt, endedAt: new Date().toISOString(),
      durationSeconds: active.elapsedSeconds, sittingSeconds: active.sittingSeconds,
      standingSeconds: active.standingSeconds, switches: active.switches, score: active.score, interrupted: false };
    this.stopTicks(); this.active = null;
    await storageService.update((data) => ({ ...data, activeWorkSession: null,
      workSessions: [...data.workSessions, session] }));
    this.notify();
    window.removeEventListener("beforeunload", this.onBeforeUnload);
  }
  private onBeforeUnload = () => {
    if (!this.active) return;
    const active = this.active;
    const now = Date.now();
    const extra = active.paused ? 0 : Math.max(0, Math.floor((now - active.modeStartedAt) / 1000));
    const sittingSeconds = active.sittingSeconds + (active.mode === "sitting" ? extra : 0);
    const standingSeconds = active.standingSeconds + (active.mode === "standing" ? extra : 0);
    const settings = storageService.getData().settings;
    const earned = standingSeconds / 60 * settings.standUpPoints;
    const penalty = Math.max(0, sittingSeconds / 60 - settings.sittingPenaltyAfterMinutes) * settings.sittingPenaltyPerMinute;
    const score = Math.round((earned - penalty) * 100) / 100;

    // beforeunload is synchronous: write straight to localStorage so closing
    // the desktop window can save the result before the process exits.
    try {
      const raw = localStorage.getItem("standup-app-data-v1");
      if (raw) {
        const data = JSON.parse(raw) as ReturnType<typeof storageService.getData>;
        const durationSeconds = active.elapsedSeconds + extra;
        const workSessions = score > 0 ? [...data.workSessions, {
          id: active.id, startedAt: active.startedAt, endedAt: new Date(now).toISOString(),
          durationSeconds, sittingSeconds, standingSeconds, switches: active.switches, score, interrupted: false,
        }] : data.workSessions;
        localStorage.setItem("standup-app-data-v1", JSON.stringify({ ...data, activeWorkSession: null, workSessions }));
      }
    } catch (error) {
      console.error("Worksession konnte beim Schließen nicht gespeichert werden:", error);
    }
    this.stopTicks();
    this.active = null;
  };
  installUnloadHandler() { window.addEventListener("beforeunload", this.onBeforeUnload); }
}
const workSessionService = new WorkSessionService();
export default workSessionService;
