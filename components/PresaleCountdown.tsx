import { useEffect, useState } from 'react';

interface PresaleCountdownProps {
  endTime: number;
  softCap: string;
  totalContributed: string;
  symbol: string;
  isFinalized: boolean;
}

export function PresaleCountdown({ 
  endTime, 
  softCap, 
  totalContributed,
  symbol,
  isFinalized 
}: PresaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (60 * 60 * 24)),
        hours: Math.floor((difference % (60 * 60 * 24)) / (60 * 60)),
        minutes: Math.floor((difference % (60 * 60)) / 60),
        seconds: difference % 60,
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const softCapNumber = parseFloat(softCap);
  const totalContributedNumber = parseFloat(totalContributed);
  const progress = (totalContributedNumber / softCapNumber) * 100;

  return (
    <div className="space-y-2">
      {/* Countdown Timer */}
      {timeLeft ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-gray-700 rounded p-2">
            <div className="text-lg font-bold text-white">{timeLeft.days}</div>
            <div className="text-xs text-gray-400">Days</div>
          </div>
          <div className="bg-gray-700 rounded p-2">
            <div className="text-lg font-bold text-white">{timeLeft.hours}</div>
            <div className="text-xs text-gray-400">Hours</div>
          </div>
          <div className="bg-gray-700 rounded p-2">
            <div className="text-lg font-bold text-white">{timeLeft.minutes}</div>
            <div className="text-xs text-gray-400">Minutes</div>
          </div>
          <div className="bg-gray-700 rounded p-2">
            <div className="text-lg font-bold text-white">{timeLeft.seconds}</div>
            <div className="text-xs text-gray-400">Seconds</div>
          </div>
        </div>
      ) : (
        <div className="text-center text-white bg-gray-700 rounded p-2">
          {isFinalized ? "Presale Finalized" : "Presale Ended"}
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progress: {progress.toFixed(2)}%</span>
          <span>{totalContributed} / {softCap} ETH</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
} 