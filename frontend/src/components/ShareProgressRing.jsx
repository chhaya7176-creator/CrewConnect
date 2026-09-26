// Circular progress ring showing real referral sign-ups toward the free-unlock target.
export const ShareProgressRing = ({ current = 0, target = 2, size = 120 }) => {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, target > 0 ? current / target : 0);
  const offset = circ * (1 - pct);
  const remaining = Math.max(0, target - current);
  const done = remaining === 0;

  return (
    <div className="flex flex-col items-center" data-testid="share-progress-ring">
      <div className={`relative ${done ? "ring-glow" : ""}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#25D366"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-data text-2xl font-extrabold text-white leading-none" data-testid="ring-count">{current}</div>
          <div className="text-[10px] text-[#8A8F9E] mt-0.5">of {target}</div>
        </div>
      </div>
      <div className="mt-2 text-center" data-testid="ring-nudge">
        {done ? (
          <span className="text-sm font-bold text-[#25D366]">Target reached — boost unlocked! 🎉</span>
        ) : remaining === 1 ? (
          <span className="text-sm font-bold text-[#DFFF00]">You're 1 sign-up away 🎉</span>
        ) : (
          <span className="text-sm font-semibold text-[#C9CFDA]">{remaining} sign-ups away from a free boost</span>
        )}
      </div>
    </div>
  );
};
