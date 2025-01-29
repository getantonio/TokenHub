import { useState } from 'react';
import TokenAdmin from './TokenAdmin';
import TokenAdminV2 from './TokenAdminV2';

interface TokenVersionSwitcherProps {
  isConnected: boolean;
  address?: string;
}

export default function TokenVersionSwitcher({ isConnected, address }: TokenVersionSwitcherProps) {
  const [selectedVersion, setSelectedVersion] = useState<'v1' | 'v2'>('v2');

  return (
    <div className="space-y-4">
      <div className="flex justify-start gap-4 mb-6">
        <button
          onClick={() => setSelectedVersion('v1')}
          className={`px-4 py-2 rounded-lg ${
            selectedVersion === 'v1'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Version 1
        </button>
        <button
          onClick={() => setSelectedVersion('v2')}
          className={`px-4 py-2 rounded-lg ${
            selectedVersion === 'v2'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Version 2
        </button>
      </div>

      {selectedVersion === 'v1' ? (
        <TokenAdmin isConnected={isConnected} address={address} />
      ) : (
        <TokenAdminV2 isConnected={isConnected} address={address} />
      )}
    </div>
  );
}