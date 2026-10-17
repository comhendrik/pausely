import { useState } from "react";
import {
  Timer,
  Settings,
  History,
} from "lucide-react";

import TimerPage from "./pages/TimerPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import { TimerProvider } from "./context/TimerContext";

type Page = "timer" | "history" | "settings";

const App = () => {
  const [page, setPage] = useState<Page>("timer");

  const renderPage = () => {
    switch (page) {
      case "timer":
        return <TimerPage />;

      case "history":
        return <HistoryPage />;

      case "settings":
        return <SettingsPage />;

      default:
        return <TimerPage />;
    }
  };

  const tabs = [
    { id: "timer" as const, icon: Timer, label: "Timer" },
    { id: "history" as const, icon: History, label: "Verlauf" },
    {
      id: "settings" as const,
      icon: Settings,
      label: "Einstellungen",
    },
  ];

  return (
    <TimerProvider>
      <div className="min-h-screen bg-gray-50 pb-24">
        <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
          {renderPage()}
        </main>

        {/* Navigation am unteren Bildschirmrand */}
        <nav
          aria-label="Hauptnavigation"
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-2xl justify-around px-2 py-2">
            {tabs.map(({ id, icon: Icon, label }) => {
              const isActive = page === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPage(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                    isActive
                      ? "font-medium text-blue-600"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    size={23}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />

                  <span className="text-xs">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </TimerProvider>
  );
};

export default App;
