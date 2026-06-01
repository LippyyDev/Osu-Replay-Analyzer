'use client';

interface ScoreGaugeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind color class
  label?: string;
  showNumber?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#ef4444'; // red
  if (score >= 50) return '#f97316'; // orange
  if (score >= 25) return '#eab308'; // yellow
  return '#22c55e'; // green
}

export default function ScoreGauge({
  score,
  size = 'md',
  color,
  label,
  showNumber = true,
}: ScoreGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const resolvedColor = color ?? getScoreColor(score);

  const sizeMap = {
    sm: { width: 80, stroke: 6, fontSize: 18, labelSize: 9 },
    md: { width: 120, stroke: 8, fontSize: 26, labelSize: 11 },
    lg: { width: 160, stroke: 10, fontSize: 36, labelSize: 14 },
  };

  const { width, stroke, fontSize, labelSize } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius; // semi-circle
  const dashOffset = circumference * (1 - clampedScore / 100);

  const cx = width / 2;
  const cy = width / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width, height: width / 2 + stroke }}>
        <svg
          width={width}
          height={width / 2 + stroke * 2}
          viewBox={`0 0 ${width} ${width / 2 + stroke * 2}`}
          style={{ overflow: 'visible' }}
        >
          {/* Track */}
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Progress */}
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 6px ${resolvedColor}80)`,
            }}
          />
          {/* Score text */}
          {showNumber && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={resolvedColor}
              fontSize={fontSize}
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {Math.round(clampedScore)}
            </text>
          )}
        </svg>
      </div>
      {label && (
        <span
          className="text-white/40 font-medium tracking-wider uppercase"
          style={{ fontSize: labelSize }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
