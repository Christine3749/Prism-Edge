export function AiMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-slate-300 leading-relaxed max-w-4xl text-xs font-sans">
      {lines.map((line, i) => renderLine(line, i))}
    </div>
  );
}

function renderLine(line: string, key: number) {
  const trimmed = line.trim();
  if (trimmed.startsWith("###") || trimmed.startsWith("##")) {
    return (
      <h4 key={key} className="text-cyan-400 font-bold text-xs tracking-tight pt-2 border-b border-slate-800 pb-0.5 uppercase">
        {trimmed.replace(/^###?\s*/, "")}
      </h4>
    );
  }
  if (trimmed.startsWith("#")) {
    return (
      <h3 key={key} className="text-white font-black text-sm tracking-tight pt-3">
        {trimmed.replace(/^#\s*/, "")}
      </h3>
    );
  }

  const content = renderBoldParts(trimmed);
  if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
    return (
      <div key={key} className="flex gap-2 items-start pl-2">
        <span className="text-cyan-500 mt-0.5 select-none">•</span>
        <span className="flex-grow">{content.length > 0 ? content : trimmed.replace(/^[-•*]\s*/, "")}</span>
      </div>
    );
  }

  return <p key={key} className="text-slate-300 pl-1">{content.length > 0 ? content : trimmed}</p>;
}

function renderBoldParts(text: string) {
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(<strong key={match.index} className="text-white font-extrabold">{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts;
}
