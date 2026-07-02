import React, { useRef, useState } from "react";
import { Language } from "../../shared/src/translations";
import type { WorkspaceDeck } from "./SignalScanner";

export function WorkspaceDeckSwitch({
  activeDeck,
  compact = false,
  lang,
  onSelect
}: {
  activeDeck: WorkspaceDeck | null;
  compact?: boolean;
  lang: Language;
  onSelect: (deck: WorkspaceDeck) => void;
}) {
  const zh = lang === "zh" || lang === "tc";
  const dragStartY = useRef<number | null>(null);
  const dragStartTranslate = useRef(0);
  const didDrag = useRef(false);
  const pressedDeck = useRef<WorkspaceDeck | null>(null);
  const decks: WorkspaceDeck[] = [6, 5, 4, 3, 2, 1];
  const slotSize = compact ? 24 : 32;
  const minTranslate = -((decks.length - 4) * slotSize);
  const romanLabels: Record<WorkspaceDeck, string> = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI"
  };
  const labels: Record<WorkspaceDeck, string> = {
    1: zh ? "I 作战室：价格、假设、执行" : "I Workbench: price, thesis, execution",
    2: zh ? "II 交易信号：空头、压力、事件" : "II Trading Signals: shorts, pressure, events",
    3: zh ? "III 全市场矩阵：筛选、排序、解释" : "III Signal Matrix: screen, rank, explain",
    4: zh ? "IV 执行控制：ROI、退出成本、组合风险" : "IV Edge Control: ROI, exit cost, portfolio risk",
    5: zh ? "V 复盘归因：学习、校准、回灌" : "V Attribution: review, calibrate, feedback",
    6: zh ? "VI 元治理：双智能体仲裁" : "VI Meta-Governance: dual-agent arbitration"
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const baseTranslateForDeck = (deck: WorkspaceDeck) => deck >= 5 ? -((6 - deck) * slotSize) : minTranslate;
  const [trackTranslate, setTrackTranslate] = useState(() => baseTranslateForDeck(activeDeck ?? 1));

  const readPressedDeck = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return null;
    const button = target.closest<HTMLElement>("[data-workspace-deck-button]");
    const deck = Number(button?.dataset.deck);
    return decks.includes(deck as WorkspaceDeck) ? deck as WorkspaceDeck : null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragStartY.current = event.clientY;
    dragStartTranslate.current = trackTranslate;
    didDrag.current = false;
    pressedDeck.current = readPressedDeck(event.target);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const deltaY = event.clientY - dragStartY.current;
    if (Math.abs(deltaY) > 3) didDrag.current = true;
    setTrackTranslate(clamp(dragStartTranslate.current + deltaY, minTranslate, 0));
    event.preventDefault();
  };

  const commitDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const selectedDeck = didDrag.current ? null : pressedDeck.current;
    dragStartY.current = null;
    didDrag.current = false;
    pressedDeck.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (selectedDeck) onSelect(selectedDeck);
  };

  const cancelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = null;
    didDrag.current = false;
    pressedDeck.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      data-workspace-deck-rail
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commitDrag}
      onPointerCancel={cancelDrag}
      className={`overflow-hidden overscroll-none rounded-md border border-[#12324a]/55 bg-[#010813]/72 p-0.5 no-scrollbar select-none ${compact ? "h-[6rem] w-7" : "h-[8.25rem] w-10"}`}
      aria-label={zh ? "平台模式轨" : "Platform mode rail"}
    >
      <div
        className="grid grid-cols-1 gap-1 will-change-transform"
        style={{
          transform: `translateY(${trackTranslate}px)`,
          transition: dragStartY.current === null ? "transform 160ms cubic-bezier(0.22, 1, 0.36, 1)" : "none"
        }}
      >
        {decks.map((deck) => {
          const active = activeDeck === deck;
          return (
            <button
              key={deck}
              type="button"
              data-workspace-deck-button
              data-deck={deck}
              data-active={active ? "true" : "false"}
              aria-pressed={active}
              className={`${compact ? "h-5 text-[9px]" : "h-7 text-[11px]"} w-full shrink-0 cursor-pointer rounded border font-black transition-[background-color,color,border-color] ${
                active
                  ? "border-blue-400/35 bg-[#06233a] text-blue-100"
                  : "border-transparent text-slate-500 hover:bg-[#031426]/90 hover:text-slate-200"
              }`}
              title={labels[deck]}
              aria-label={labels[deck]}
            >
              {romanLabels[deck]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
