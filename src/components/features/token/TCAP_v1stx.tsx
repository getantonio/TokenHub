import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { useStacksWallet } from '@/contexts/StacksWalletContext';
import { CopyIcon, ExternalLinkIcon, SearchIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon, EyeOff, Eye } from 'lucide-react';
import { useNetwork } from '@/contexts/NetworkContext';
import { getExplorerUrl } from '@/config/networks';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { request } from '@stacks/connect';
import { ChainId } from '@/types/network';

const getStacksExplorerUrlWithType = (networkConfig: any, addressOrHash: string, type: 'address' | 'tx' = 'address'): string => {
  if (!networkConfig) return '#';
  const baseUrl = networkConfig.explorerUrl;
  if (!baseUrl) return '#';
  return `${baseUrl}/${type === 'tx' ? 'txid' : 'address'}/${addressOrHash}`;
};

interface TCAP_v1stxProps {
  isConnected: boolean;
}

interface TokenInfo {
  contractAddress: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  tokenUri: string | null;
  balance: string | null;
}

interface BlacklistAction {
  address: string;
  action: 'add' | 'remove';
}

interface TimeLockAction {
  address: string;
  duration: number;
}

export default function TCAP_v1stx({ isConnected }: TCAP_v1stxProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [hiddenTokens, setHiddenTokens] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenTokensV1_stx');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [blacklistAction, setBlacklistAction] = useState<BlacklistAction>({ address: '', action: 'add' });
  const [timeLockAction, setTimeLockAction] = useState<TimeLockAction>({ address: '', duration: 30 });

  const { toast } = useToast();
  const { address: userAddress, networkConfig, isConnected: walletConnected } = useStacksWallet();

  useEffect(() => {
    if (isConnected && userAddress && networkConfig) {
      console.log(`STX: Dependencies met. isConnected: ${isConnected}, address: ${userAddress}, network: ${networkConfig.name}. Reloading tokens.`);
      fetchUserTokens();
    } else {
       console.log(`STX: Dependencies not met. isConnected: ${isConnected}, address: ${userAddress}, networkConfig: ${!!networkConfig}. Clearing tokens.`);
       setUserTokens([]);
       setError(null);
    }
  }, [isConnected, userAddress, networkConfig]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hiddenTokensV1_stx', JSON.stringify(hiddenTokens));
    }
  }, [hiddenTokens]);

  const fetchUserTokens = async () => {
    if (!userAddress || !networkConfig) {
       setError("Wallet or network details not available.");
       setIsLoading(false);
       setUserTokens([]);
       return;
    }

    setIsLoading(true);
    setError(null);
    try {
       const baseApiUrl = networkConfig.isTestnet
         ? 'https://stacks-node-api.testnet.stacks.co' 
         : 'https://api.hiro.so';

       const response = await fetch(`${baseApiUrl}/extended/v1/address/${userAddress}/transactions?limit=50`);
       if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
       const data = await response.json();

       // Find successful direct contract deployments by the user
       const deployments = data.results.filter((tx: any) => 
         tx.tx_status === 'success' && 
         tx.tx_type === 'contract_deploy' &&
         tx.contract_deploy?.contract_identifier &&
         tx.sender_address === userAddress // Ensure the user initiated the deployment
       );
       
       console.log(`[TCAP_v1stx] Found ${deployments.length} potential contract deployment transactions.`);

       const tokenPromises = deployments.map(async (deploymentTx: any) => {
         const contractId = deploymentTx.contract_deploy.contract_identifier;
         console.log(`[TCAP_v1stx] Fetching details for deployed contract: ${contractId}`);
         return fetchTokenDetails(contractId);
       });

       const tokens = (await Promise.all(tokenPromises))
         .filter((token): token is TokenInfo => token !== null)
         .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

       setUserTokens(tokens);

       if (tokens.length === 0 && deployments.length > 0) {
           console.warn("Found deployment transactions but could not fetch token details. Check contract interface or API response.");
       }

    } catch (error: any) {
      console.error('Error fetching user tokens:', error);
      setError( error.message || "Failed to fetch user tokens. Please try again.");
      setUserTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTokenDetails = async (address: string): Promise<TokenInfo | null> => {
    if (!address.includes('.') || !networkConfig) return null;

    try {
      const baseApiUrl = networkConfig.isTestnet
        ? 'https://stacks-node-api.testnet.stacks.co' 
        : 'https://api.hiro.so';

      const functionArgs = (fnName: string, args: string[] = []) => ({
          contract_address: address.split('.')[0],
          contract_name: address.split('.')[1],
          function_name: fnName,
          arguments: args.map(arg => JSON.stringify(arg))
      });

      const callReadOnly = async (fnName: string, args: string[] = []) => {
          const response = await fetch(`${baseApiUrl}/v2/contracts/call-read/${address.split('.')[0]}/${address.split('.')[1]}/${fnName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  sender: userAddress || address.split('.')[0], // Use connected user or deployer as sender context for call-read
                  arguments: args // API expects array of hex strings for Clarity values
              })
          });
          if (!response.ok) throw new Error(`Read-only call failed for ${fnName}: ${response.statusText}`);
          const data = await response.json();
          if (!data.okay) throw new Error(`Read-only call error for ${fnName}: ${data.cause}`);
          return data.result;
      };

      const nameResult = await callReadOnly('get-name');
      const symbolResult = await callReadOnly('get-symbol');
      const decimalsResult = await callReadOnly('get-decimals');
      const totalSupplyResult = await callReadOnly('get-total-supply');
      let tokenUriResult = null;
      try { tokenUriResult = await callReadOnly('get-token-uri'); } catch (e) { console.log(`get-token-uri not found for ${address}`); }

      let balanceResult = null;
      if (userAddress) {
        try {
           balanceResult = "N/A (Clarity Parsing Needed)";
        } catch (e) {
            console.error(`Failed to get balance for ${userAddress} on ${address}:`, e);
            balanceResult = "Error";
        }
      }

      const parsedName = `Name: ${nameResult}`;
      const parsedSymbol = `Symbol: ${symbolResult}`;
      const parsedDecimals = parseInt(decimalsResult ?? '0');
      const parsedTotalSupply = `Supply: ${totalSupplyResult}`;
      const parsedTokenUri = `URI: ${tokenUriResult}`;
      const parsedBalance = `Bal: ${balanceResult}`;

      return {
        contractAddress: address,
        name: parsedName,
        symbol: parsedSymbol,
        decimals: parsedDecimals,
        totalSupply: parsedTotalSupply,
        tokenUri: parsedTokenUri,
        balance: parsedBalance,
      };
    } catch (error) {
      console.error(`Error fetching token details for ${address}:`, error);
      return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  const hideToken = (tokenAddress: string) => {
    setHiddenTokens(prev => [...prev, tokenAddress]);
    toast({
      title: 'Token Hidden',
      description: 'Token has been hidden from the list (reload to see change if needed)',
    });
  };

  const resetHiddenTokens = () => {
    setHiddenTokens([]);
    setSelectedToken(null);
    toast({
      title: "Hidden tokens cleared",
      description: "All tokens are now visible",
    });
  };

  const getVisibleTokens = () => {
    return userTokens.filter(token => !hiddenTokens.includes(token.contractAddress));
  };

  const handleBlacklist = async (tokenAddress: string) => {
     toast({ variant: 'destructive', title: 'Not Implemented', description: 'Blacklist function requires contract interaction.'});
     console.log("Attempted blacklist action:", blacklistAction, "on token:", tokenAddress);
  };

  const handleTimeLock = async (tokenAddress: string) => {
     toast({ variant: 'destructive', title: 'Not Implemented', description: 'Timelock function requires contract interaction.'});
     console.log("Attempted timelock action:", timeLockAction, "on token:", tokenAddress);
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg shadow-lg text-center text-amber-500 border border-amber-500/30">
        <h2 className="text-lg font-semibold mb-2">Token Management (V1 - Stacks)</h2>
        <p>Please connect your Stacks wallet to manage tokens.</p>
      </div>
    );
  }

  return (
    <Card className="form-card bg-gray-900 border border-gray-700 text-white">
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer py-3 px-4 border-b border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium text-gray-100">
             Token Creator Admin Controls (V1 - Stacks)
          </CardTitle>
          <span className="text-xs text-gray-400">
            ({getVisibleTokens().length} tokens)
          </span>
        </div>
        <div className="flex items-center gap-2">
           {hiddenTokens.length > 0 && (
             <Button
               variant="ghost"
               onClick={(e) => {
                 e.stopPropagation();
                 resetHiddenTokens();
               }}
               className="text-xs px-2 py-1 h-7 text-blue-400 hover:bg-gray-700"
             >
               Show All ({hiddenTokens.length}) <Eye className="ml-1 h-3 w-3"/>
             </Button>
           )}
           <Button
             variant="ghost"
             onClick={(e) => {
               e.stopPropagation();
               fetchUserTokens();
             }}
             className="h-7 w-7 p-0 text-blue-400 hover:bg-gray-700"
             disabled={isLoading}
             title="Refresh Tokens"
           >
             {isLoading ? <Spinner className="h-4 w-4" /> : <RefreshCwIcon className="h-4 w-4" />}
           </Button>
           <span className="text-gray-400 hover:text-white">
             {isExpanded ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
           </span>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <Spinner className="w-6 h-6 text-gray-300" />
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-400">
              Error: {error}
            </div>
          ) : getVisibleTokens().length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No V1 tokens found deployed by your address on this network.
            </div>
          ) : (
            <div className="space-y-3">
              {getVisibleTokens().map(token => (
                <div key={token.contractAddress} className="border border-gray-700 rounded-lg p-3 bg-gray-800/50 shadow-md">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-gray-100 flex items-center gap-1">
                        {token.name || 'Unnamed Token'} ({token.symbol || 'N/A'})
                        <CopyIcon
                           className="h-3 w-3 text-gray-500 hover:text-white cursor-pointer"
                           onClick={() => copyToClipboard(token.contractAddress)}
                         />
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 break-all">
                         {token.contractAddress}
                      </p>
                      <p className="text-xs text-gray-400">
                         Supply: {token.totalSupply || 'N/A'}
                         {token.balance && ` | Your Balance: ${token.balance}`}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedToken(selectedToken === token.contractAddress ? null : token.contractAddress)}
                        className="text-xs px-2 py-1 h-7 border border-blue-500 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300"
                      >
                        {selectedToken === token.contractAddress ? 'Close' : 'Manage'}
                      </Button>
                      <Button
                         variant="ghost"
                         onClick={() => hideToken(token.contractAddress)}
                         className="text-xs px-2 py-1 h-7 border border-gray-600 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                         title="Hide token from this list"
                      >
                         <EyeOff className="h-3 w-3"/>
                      </Button>
                    </div>
                  </div>

                  {selectedToken === token.contractAddress && (
                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                       <div>
                          <h4 className="text-xs font-medium text-gray-200 mb-1">Token Explorer</h4>
                          <a
                            href={getStacksExplorerUrlWithType(networkConfig, token.contractAddress, 'address')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs px-2 py-1 h-7 rounded bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            View on Explorer <ExternalLinkIcon className="ml-1 h-3 w-3"/>
                          </a>
                       </div>

                       <div className="space-y-1">
                         <div className="flex items-center gap-1">
                           <h4 className="text-xs font-medium text-gray-200">Blacklist Management</h4>
                           <InfoIcon content="Add or remove addresses from the blacklist (requires contract support)." />
                         </div>
                         <div className="flex gap-1 items-center">
                           <Input
                             type="text"
                             placeholder="Address (e.g., ST...)"
                             value={blacklistAction.address}
                             onChange={(e) => setBlacklistAction(prev => ({ ...prev, address: e.target.value }))}
                             className="flex-1 h-7 text-xs bg-gray-700 border-gray-600 placeholder-gray-500"
                             disabled
                           />
                           <select
                             value={blacklistAction.action}
                             onChange={(e) => setBlacklistAction(prev => ({ ...prev, action: e.target.value as 'add' | 'remove' }))}
                             className="h-7 rounded bg-gray-700 text-xs border-gray-600 text-white"
                             disabled
                           >
                             <option value="add">Add</option>
                             <option value="remove">Remove</option>
                           </select>
                           <Button
                             onClick={() => handleBlacklist(token.contractAddress)}
                             disabled
                             className="text-xs px-2 py-1 h-7 bg-gray-600 cursor-not-allowed"
                           >
                             Apply
                           </Button>
                         </div>
                       </div>

                       <div className="space-y-1">
                         <div className="flex items-center gap-1">
                            <h4 className="text-xs font-medium text-gray-200">TimeLock Management</h4>
                            <InfoIcon content="Lock addresses for a specified duration (requires contract support)." />
                         </div>
                         <div className="flex gap-1 items-center">
                            <Input
                              type="text"
                              placeholder="Address (e.g., ST...)"
                              value={timeLockAction.address}
                              onChange={(e) => setTimeLockAction(prev => ({ ...prev, address: e.target.value }))}
                              className="flex-1 h-7 text-xs bg-gray-700 border-gray-600 placeholder-gray-500"
                              disabled
                            />
                            <Input
                              type="number"
                              placeholder="Days"
                              value={timeLockAction.duration}
                              onChange={(e) => setTimeLockAction(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                              className="w-20 h-7 text-xs bg-gray-700 border-gray-600 placeholder-gray-500"
                              min="1"
                              disabled
                            />
                            <Button
                              onClick={() => handleTimeLock(token.contractAddress)}
                              disabled
                              className="text-xs px-2 py-1 h-7 bg-gray-600 cursor-not-allowed"
                            >
                              Lock
                            </Button>
                         </div>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
} 