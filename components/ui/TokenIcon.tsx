import { useEffect, useState } from 'react';
import { Jazzicon } from '@ukstv/jazzicon-react';

interface TokenIconProps {
  address: string;
  size?: number;
}

export function TokenIcon({ address, size = 24 }: TokenIconProps) {
  return (
    <div style={{ width: size, height: size }}>
      <Jazzicon address={address} />
    </div>
  );
} 