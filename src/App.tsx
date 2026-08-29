import TimerPage from "./pages/TimerPage";
import { useState } from "react";
import {
  Timer,
  Settings,
} from "lucide-react";

const App = () => {
  const [page, setPage] = useState("timer");
 
  const renderPage = () => {
    switch (page) {
      case "timer":
        return <TimerPage />;
      case "settings":
        return (
          <div className="pt-10 text-center text-gray-500">
            Will be available soon
          </div>
        );
      default:
        return null;
    }
  };
 
  const tabs = [
    { id: "timer", icon: Timer, label: "Timer" },
    { id: "settings", icon: Settings, label: "Einstellungen" },
  ];
 
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-6">{renderPage()}</div>
 
      {/* Nav Bar: standardmäßig fix am unteren Bildschirmrand */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t bg-white p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPage(id)}
            className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
              page === id ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <Icon size={24} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
