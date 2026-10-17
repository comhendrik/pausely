import notificationService from "./NotificationService";
import activityService from "./ActivityService";

export interface TimerState {
  duration: number;
  remaining: number;
  isRunning: boolean;
}

type Listener = () => void;

class TimerService {
  private state: TimerState = {
    duration: 5 * 60,
    remaining: 5 * 60,
    isRunning: false,
  };

  private endTime: number | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();

  public getSnapshot = (): TimerState => this.state;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private updateState(state: TimerState): void {
    this.state = state;
    this.notify();
  }

  public setDuration(minutes: number): void {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new Error("Die Dauer muss größer als 0 sein.");
    }

    this.stopInterval();
    this.endTime = null;

    const seconds = Math.floor(minutes * 60);

    this.updateState({
      duration: seconds,
      remaining: seconds,
      isRunning: false,
    });
  }

  public start(): void {
    if (this.state.isRunning) return;

    if (this.state.remaining <= 0) {
      this.updateState({
        ...this.state,
        remaining: this.state.duration,
      });
    }

    this.endTime = Date.now() + this.state.remaining * 1000;

    this.updateState({
      ...this.state,
      isRunning: true,
    });

    this.tick();
    this.interval = setInterval(() => this.tick(), 250);
  }

  public pause(): void {
    if (!this.state.isRunning) return;

    this.tick();

    if (!this.state.isRunning) return;

    this.stopInterval();
    this.endTime = null;

    this.updateState({
      ...this.state,
      isRunning: false,
    });
  }

  public reset(): void {
    this.stopInterval();
    this.endTime = null;

    this.updateState({
      ...this.state,
      remaining: this.state.duration,
      isRunning: false,
    });
  }

  private tick(): void {
    if (this.endTime === null) return;

    const remaining = Math.max(
      0,
      Math.ceil((this.endTime - Date.now()) / 1000),
    );

    if (remaining === 0) {
      this.stopInterval();
      this.endTime = null;

      this.updateState({
        ...this.state,
        remaining: 0,
        isRunning: false,
      });

      void activityService
        .createPendingSession(this.state.duration)
        .catch(console.error);

      notificationService.sendNotification(
        "Zeit aufzustehen! Bestätige deine Aktivität in der App.",
      );

      return;
    }

    if (remaining !== this.state.remaining) {
      this.updateState({
        ...this.state,
        remaining,
      });
    }
  }

  private stopInterval(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

const timerService = new TimerService();

export default timerService;