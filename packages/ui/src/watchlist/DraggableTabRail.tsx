import { useRef, type ReactNode } from "react";

type RailDragState = {
  active: boolean;
  dragging: boolean;
  pointerId: number;
  startX: number;
  lastX: number;
  lastTime: number;
  velocity: number;
};

const idleRailDragState: RailDragState = {
  active: false,
  dragging: false,
  pointerId: -1,
  startX: 0,
  lastX: 0,
  lastTime: 0,
  velocity: 0
};

export function DraggableTabRail({ children }: { children: ReactNode }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<RailDragState>({ ...idleRailDragState });
  const suppressClickRef = useRef(false);

  const resetDragState = () => {
    dragStateRef.current = { ...idleRailDragState };
  };

  return (
    <div className="relative mt-3">
      <div
        ref={railRef}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          const rail = railRef.current;
          if (!rail) return;
          suppressClickRef.current = false;
          const now = window.performance.now();
          dragStateRef.current = {
            active: true,
            dragging: false,
            pointerId: event.pointerId,
            startX: event.clientX,
            lastX: event.clientX,
            lastTime: now,
            velocity: 0
          };
        }}
        onPointerMove={(event) => {
          const state = dragStateRef.current;
          const rail = railRef.current;
          if (!state.active || !rail) return;

          const totalDeltaX = event.clientX - state.startX;
          if (!state.dragging && Math.abs(totalDeltaX) <= 6) return;

          if (!state.dragging) {
            state.dragging = true;
            suppressClickRef.current = true;
            rail.setPointerCapture?.(event.pointerId);
          }

          event.preventDefault();
          rail.scrollLeft -= event.clientX - state.lastX;
          state.lastX = event.clientX;
          state.lastTime = window.performance.now();
        }}
        onPointerUp={(event) => {
          const state = dragStateRef.current;
          const wasDragging = state.dragging;
          const rail = railRef.current;

          if (rail && wasDragging && state.pointerId === event.pointerId) {
            rail.releasePointerCapture?.(event.pointerId);
          }

          resetDragState();
          if (!wasDragging) {
            suppressClickRef.current = false;
            return;
          }

          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 80);
        }}
        onPointerCancel={(event) => {
          const state = dragStateRef.current;
          if (railRef.current && state.dragging && state.pointerId === event.pointerId) {
            railRef.current.releasePointerCapture?.(event.pointerId);
          }
          resetDragState();
          suppressClickRef.current = false;
        }}
        onPointerLeave={() => {
          const state = dragStateRef.current;
          if (state.dragging) return;
          resetDragState();
        }}
        onWheel={(event) => {
          const rail = railRef.current;
          if (!rail || rail.scrollWidth <= rail.clientWidth) return;
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
          if (Math.abs(delta) < 1) return;
          rail.scrollLeft += delta;
          event.preventDefault();
        }}
        data-watchlist-rail
        className="flex h-8 cursor-grab touch-pan-x select-none gap-0.5 overflow-x-auto rounded border border-slate-800/55 bg-slate-950/20 p-0.5 text-[9px] font-semibold text-slate-400 no-scrollbar active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  );
}
