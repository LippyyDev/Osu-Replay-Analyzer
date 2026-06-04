'use client';

interface ScoreGaugeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind color class
  label?: string;
  showNumber?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'var(--color-neo-red)';
  if (score >= 50) return 'var(--color-neo-orange)';
  if (score >= 25) return 'var(--color-neo-yellow)';
  return 'var(--color-neo-green)';
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
    sm: { width: 80, stroke: 10, fontSize: 20, labelSize: 10 },
    md: { width: 120, stroke: 14, fontSize: 32, labelSize: 12 },
    lg: { width: 160, stroke: 18, fontSize: 44, labelSize: 16 },
  };

  const { width, stroke, fontSize, labelSize } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = Math.PI * radius; // semi-circle
  const dashOffset = circumference * (1 - clampedScore / 100);

  const cx = width / 2;
  const cy = width / 2;

  return (
    <div className="flex flex-col items-center gap-1 font-mono">
      <div className="relative" style={{ width, height: width / 2 + stroke }}>
        <svg
          width={width}
          height={width / 2 + stroke * 2}
          viewBox={`0 0 ${width} ${width / 2 + stroke * 2}`}
          style={{ overflow: 'visible' }}
        >
          {/* Shadow track */}
          <path
            d={`M ${stroke / 2 + 4} ${cy + 4} A ${radius} ${radius} 0 0 1 ${width - stroke / 2 + 4} ${cy + 4}`}
            fill="none"
            stroke="black"
            strokeWidth={stroke + 4}
            strokeLinecap="round"
          />
          {/* Base track outline (thick black) */}
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`}
            fill="none"
            stroke="black"
            strokeWidth={stroke + 4}
            strokeLinecap="round"
          />
          {/* Base track (white) */}
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`}
            fill="none"
            stroke="white"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Progress (colored) */}
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />

          {/* Score text shadow */}
          {showNumber && (
            <text
              x={cx + 2}
              y={cy + 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="black"
              fontSize={fontSize}
              fontWeight="900"
            >
              {Math.round(clampedScore)}
            </text>
          )}
          {/* Score text */}
          {showNumber && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={resolvedColor}
              fontSize={fontSize}
              fontWeight="900"
              stroke="black"
              strokeWidth="1.5"
              paintOrder="stroke"
            >
              {Math.round(clampedScore)}
            </text>
          )}
        </svg>
      </div>
      {label && (
        <span
          className="text-black font-black uppercase bg-white px-2 py-0.5 brutal-border shadow-[2px_2px_0_0_#000]"
          style={{ fontSize: labelSize }}
        >
          {label.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  );
}
