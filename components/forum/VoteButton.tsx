'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';

interface VoteButtonProps {
  direction: 'up' | 'down';
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function VoteButton({ direction, active, onClick, disabled }: VoteButtonProps) {
  const isUp = direction === 'up';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Login to vote' : isUp ? 'Upvote' : 'Downvote'}
      className={`w-8 h-8 flex items-center justify-center rounded-lg border-[2px] border-black transition-all
                  active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed
                  ${active
                    ? isUp
                      ? 'bg-green-500 text-white shadow-[2px_2px_0_0_#000]'
                      : 'bg-red-500 text-white shadow-[2px_2px_0_0_#000]'
                    : 'bg-white hover:bg-[var(--color-neo-yellow)]'
                  }`}
    >
      {isUp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );
}
