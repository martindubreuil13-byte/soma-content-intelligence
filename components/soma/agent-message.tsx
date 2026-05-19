interface AgentMessageProps {
  greeting: string;
  message: string;
  insights?: string[];
  dateLabel?: string;
}

export function AgentMessage({ greeting, message, insights = [], dateLabel }: AgentMessageProps) {
  return (
    <div className="mt-7 text-center">
      {dateLabel && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/22">
          {dateLabel}
        </p>
      )}
      <h2 className="mt-3 font-display text-3xl text-white/90 sm:text-[2.6rem] sm:leading-tight">
        {greeting}
      </h2>
      <p className="mx-auto mt-4 max-w-[460px] text-[15px] leading-7 text-white/45">
        {message}
      </p>
      {insights.length > 0 && (
        <div className="mt-5 flex flex-col items-center gap-1.5">
          {insights.map((insight, i) => (
            <p key={i} className="text-sm italic text-white/28">
              {insight}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
