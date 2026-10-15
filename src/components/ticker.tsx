import { tickerItems } from "@/lib/site";

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex items-center gap-10 pr-10">
      {tickerItems.map((item) => (
        <li key={item} className="flex items-center gap-10">
          <span className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.18em] text-faint">
            {item}
          </span>
          <span className="text-[10px] text-accent/40" aria-hidden="true">
            ◇
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Ticker() {
  return (
    <div className="marquee overflow-hidden border-y border-line bg-ink-2/60 py-4">
      <div className="marquee-track flex">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
