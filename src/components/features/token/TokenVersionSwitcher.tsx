import TokenAdminV2 from './TCAP_v2';

interface TokenVersionSwitcherProps {
  isConnected: boolean;
  address?: string;
}

export function TokenVersionSwitcher({ isConnected, address }: TokenVersionSwitcherProps) {
  if (!isConnected) {
    return (
      <div className="p-1 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management</h2>
        <p className="text-xs text-text-secondary">Please connect your wallet to manage tokens.</p>
      </div>
    );
  }

  return <TokenAdminV2 address={address} />;
}