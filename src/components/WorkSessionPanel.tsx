import { useEffect, useSyncExternalStore } from "react";
import { Play, Square } from "lucide-react";
import workSessionService from "../services/WorkSessionService";

const fmt = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2,"0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;

export default function WorkSessionPanel() {
  const active = useSyncExternalStore(workSessionService.subscribe, workSessionService.getSnapshot, workSessionService.getSnapshot);
  useEffect(() => { workSessionService.installUnloadHandler(); }, []);
  const elapsed = active && !active.paused ? Math.max(0, Math.floor((Date.now() - active.modeStartedAt) / 1000)) : 0;
  const sitting = (active?.sittingSeconds ?? 0) + (active?.mode === "sitting" ? elapsed : 0);
  const standing = (active?.standingSeconds ?? 0) + (active?.mode === "standing" ? elapsed : 0);

  return <aside aria-label="Aktuelle Worksession" className="fixed bottom-[68px] left-0 right-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-3px_12px_rgba(0,0,0,0.07)] backdrop-blur">
    <div className="mx-auto flex max-w-2xl items-center justify-between gap-5 px-4 py-4 sm:px-6 sm:py-5">
      {!active ? <>
        <div className="min-w-0 space-y-1"><p className="text-sm font-semibold">Keine Worksession aktiv</p><p className="text-xs leading-relaxed text-gray-500">Starte, um Sitz- und Stehzeit zu erfassen.</p></div>
        <button onClick={() => void workSessionService.start()} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"><Play className="mr-1 inline" size={15}/>Start</button>
      </> : <>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${active.mode === "standing" ? "bg-green-500" : "bg-blue-500"}`}/><p className="text-sm font-semibold">Worksession</p><span className="text-sm tabular-nums text-gray-500">{fmt(active.elapsedSeconds + elapsed)}</span></div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500"><span>Sitzen {fmt(sitting)}</span><span>Stehen {fmt(standing)}</span><span className="font-medium text-gray-700">{active.score.toFixed(1)} Punkte</span></div>
        </div>
        <button onClick={() => void workSessionService.finish()} aria-label="Worksession beenden" title="Worksession beenden" className="shrink-0 rounded-lg border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50"><Square size={17}/></button>
      </>}
    </div>
  </aside>;
}
