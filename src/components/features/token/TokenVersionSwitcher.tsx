import TokenAdmin from './TCAP_v1';
import TokenAdminV2 from './TCAP_v2';
import { BrowserProvider } from 'ethers';
import FactoryOwnerControls_v1 from '../admin/FactoryOwnerControls_v1';
import FactoryOwnerControls_v2 from '../admin/FactoryOwnerControls_v2';

interface TokenVersionSwitcherProps {
  version: 'v1' | 'v2';
  isConnected: boolean;
  provider: BrowserProvider | null;
  address?: string;
}

export function TokenVersionSwitcher({ version, isConnected, provider, address }: TokenVersionSwitcherProps) {
  if (version === 'v1') {
    return <TokenAdmin isConnected={isConnected} provider={provider} address={address} />;
  }

  return <TokenAdminV2 isConnected={isConnected} provider={provider} address={address} />;
}