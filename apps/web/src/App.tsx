import { lazy, Suspense } from "react";
import PrismEdgeTerminal from "./PrismEdgeTerminal";

const TemporaFlip = lazy(() => import("./tempora/TemporaFlip"));

export default function App() {
  const isTemporaRoute = window.location.pathname.startsWith("/tempora");
  return isTemporaRoute ? (
    <Suspense fallback={null}>
      <TemporaFlip />
    </Suspense>
  ) : <PrismEdgeTerminal />;
}
