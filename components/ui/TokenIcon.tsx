import { useMemo } from 'react';

interface TokenIconProps {
  address: string;
  size?: number;
}

export function TokenIcon({ address, size = 24 }: TokenIconProps) {
  const backgroundColor = useMemo(() => {
    // Generate a deterministic color based on the address
    const hash = address.toLowerCase().slice(2, 8);
    const hue = parseInt(hash, 16) % 360;
    return `hsl(${hue}, 70%, 20%)`;
  }, [address]);

  const letter = useMemo(() => {
    // Use the first letter of the address
    return address.slice(2, 3).toUpperCase();
  }, [address]);

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor,
        fontSize: Math.max(size * 0.4, 12)
      }}
    >
      {letter}
    </div>
  );
} 