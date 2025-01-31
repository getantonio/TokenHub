import { useState } from 'react';
import TokenAdmin from './TokenAdmin';
import TokenAdminV2 from './TokenAdminV2';
import { BrowserProvider } from 'ethers';

interface TokenVersionSwitcherProps {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
}

export default function TokenVersionSwitcher({ isConnected, address, provider }: TokenVersionSwitcherProps) {
  const [selectedVersion, setSelectedVersion] = useState<'v1' | 'v2'>('v2');

  return (
    <div className="space-y-4">
      <div className="flex justify-start gap-4 mb-6">
        <button
          onClick={() => setSelectedVersion('v1')}
          className={`btn-blue ${
            selectedVersion === 'v1'
              ? ''
              : 'opacity-60 hover:opacity-80'
          }`}
        >
          Version 1
        </button>
        <button
          onClick={() => setSelectedVersion('v2')}
          className={`btn-blue ${
            selectedVersion === 'v2'
              ? ''
              : 'opacity-60 hover:opacity-80'
          }`}
        >
          Version 2
        </button>
      </div>

      {selectedVersion === 'v1' ? (
        <TokenAdmin isConnected={isConnected} address={address} provider={provider} />
      ) : (
        <TokenAdminV2 isConnected={isConnected} address={address} provider={provider} />
      )}
    </div>
  );
}