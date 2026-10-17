import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import timerService from "../services/TimerSerivce";

const TimerContext = createContext(timerService);

export function TimerProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TimerContext.Provider value={timerService}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const service = useContext(TimerContext);

  const timer = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );

  return {
    ...timer,
    start: () => service.start(),
    pause: () => service.pause(),
    reset: () => service.reset(),
    setDuration: (minutes: number) =>
      service.setDuration(minutes),
  };
}