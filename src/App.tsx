import { AppHeader } from "@/components/AppHeader";
import { cn } from "@/lib/utils";
import { useGarden } from "@/store/runtime";
import { GardenView } from "@/views/GardenView";
import { TelemetryView } from "@/views/TelemetryView";

export function App() {
  const view = useGarden((s) => s.view);
  return (
    <>
      <div className="paper-atmosphere" aria-hidden />
      <div className="relative z-10 min-h-dvh">
        <AppHeader />
        <main
          id="view-panel"
          role="tabpanel"
          aria-labelledby={`tab-${view}`}
          className="mx-auto max-w-[1320px] px-4 pt-10 pb-20 sm:px-8 sm:pt-14"
        >
          <div
            key={view}
            className={cn(
              "animate-fade",
              view === "telemetry" && "graph-paper -mx-4 rounded-3xl px-4 py-2 sm:-mx-8 sm:px-8",
            )}
          >
            {view === "garden" ? <GardenView /> : <TelemetryView />}
          </div>
        </main>
      </div>
    </>
  );
}
