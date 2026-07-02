import type { SignalScannerProps } from "./types";

export function workspaceDeckLabel(deck: NonNullable<SignalScannerProps["activeWorkspaceDeck"]>) {
  return deck === 1 ? "I" : deck === 2 ? "II" : deck === 3 ? "III" : deck === 4 ? "IV" : deck === 5 ? "V" : "VI";
}
