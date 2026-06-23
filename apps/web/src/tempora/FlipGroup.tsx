import { useEffect, useRef, useState } from "react";

function DigitSlice({
  position,
  value,
  animated = false
}: {
  position: "top" | "bottom";
  value: string;
  animated?: boolean;
}) {
  return (
    <div
      className={`tempora-slice tempora-slice-${position} ${animated ? "is-animated" : ""}`}
      aria-hidden="true"
    >
      <div className="tempora-slice-value">{value}</div>
    </div>
  );
}

export function FlipGroup({
  value,
  label,
  meridiem,
  showMeridiem
}: {
  value: string;
  label: string;
  meridiem?: "AM" | "PM";
  showMeridiem?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [nextValue, setNextValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === displayValue) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setPreviousValue(displayValue);
    setNextValue(value);
    setIsFlipping(true);
    timeoutRef.current = window.setTimeout(() => {
      setDisplayValue(value);
      setIsFlipping(false);
    }, 320);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [displayValue, value]);

  const topValue = isFlipping ? nextValue : displayValue;
  const bottomValue = isFlipping ? previousValue : displayValue;

  return (
    <section className={`tempora-card ${isFlipping ? "is-flipping" : ""}`} aria-label={label}>
      {showMeridiem && meridiem && (
        <span className="tempora-meridiem" aria-hidden="true">
          {meridiem}
        </span>
      )}
      <DigitSlice position="top" value={topValue} />
      <DigitSlice position="bottom" value={bottomValue} />
      {isFlipping && (
        <>
          <DigitSlice position="top" value={previousValue} animated />
          <DigitSlice position="bottom" value={nextValue} animated />
        </>
      )}
      <span className="tempora-divider" aria-hidden="true" />
      <span className="sr-only">{value}</span>
    </section>
  );
}
