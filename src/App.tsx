import { AppHeader } from "@/components/AppHeader";
import { SimulationDrawer } from "@/components/SimulationDrawer";
import { cn } from "@/lib/utils";
import { useGarden } from "@/store/runtime";
import { KitchenView } from "@/views/KitchenView";
import { TelemetryView } from "@/views/TelemetryView";

export function App() {
  const { view, drawerOpen } = useGarden((s) => ({
    view: s.view,
    drawerOpen: s.drawerOpen,
  }));
  return (
    <>
      <div className="paper-atmosphere" aria-hidden />
      <div className="relative z-10 min-h-dvh">
        <AppHeader />
        <main
          id="view-panel"
          role="tabpanel"
          aria-labelledby={`tab-${view}`}
          className={cn(
            "mx-auto max-w-[1320px] px-4 pt-10 transition-[padding] duration-300 sm:px-8 sm:pt-14",
            drawerOpen ? "pb-[34rem] sm:pb-[30rem] xl:pb-[22rem]" : "pb-28",
          )}
        >
          <div
            key={view}
            className={cn(
              "animate-fade",
              view === "telemetry" && "graph-paper -mx-4 rounded-3xl px-4 py-2 sm:-mx-8 sm:px-8",
            )}
          >
            {view === "kitchen" ? <KitchenView /> : <TelemetryView />}
          </div>
        </main>
      </div>
      <SimulationDrawer />
    </>
  );
}
