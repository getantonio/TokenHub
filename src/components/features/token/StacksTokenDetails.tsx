import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { CopyIcon, ExternalLinkIcon } from 'lucide-react';
import { request } from '@stacks/connect';
import { useStacksWallet } from '@/contexts/StacksWalletContext';

interface StacksTokenDetailsProps {
  contractAddress: string;
}

export default function StacksTokenDetails({ contractAddress }: StacksTokenDetailsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tokenDetails, setTokenDetails] = useState<{
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    totalSupply: string | null;
    tokenUri: string | null;
    userBalance: string | null;
  }>({
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null,
    tokenUri: null,
    userBalance: null
  });
  const { toast } = useToast();
  const { address: userAddress, networkConfig } = useStacksWallet();
  
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description
    });
  };
  
  const fetchTokenDetails = async () => {
    if (!contractAddress) return;
    
    setIsLoading(true);
    
    try {
      // Call read-only functions to get token details
      const [nameResp, symbolResp, decimalsResp, totalSupplyResp, tokenUriResp, userBalanceResp] = await Promise.all([
        callReadOnlyFunction(contractAddress, 'get-name', []),
        callReadOnlyFunction(contractAddress, 'get-symbol', []),
        callReadOnlyFunction(contractAddress, 'get-decimals', []),
        callReadOnlyFunction(contractAddress, 'get-total-supply', []),
        callReadOnlyFunction(contractAddress, 'get-token-uri', []),
        userAddress ? callReadOnlyFunction(contractAddress, 'get-balance', [{ type: 'principal', value: userAddress }]) : Promise.resolve(null)
      ]);
            
      // Parse the responses
      const name = parseResponse(nameResp);
      const symbol = parseResponse(symbolResp);
      const decimals = parseResponse(decimalsResp);
      const totalSupply = parseResponse(totalSupplyResp);
      const tokenUri = parseResponse(tokenUriResp);
      const userBalance = parseResponse(userBalanceResp);
      
      setTokenDetails({
        name: typeof name === 'string' ? name : null,
        symbol: typeof symbol === 'string' ? symbol : null,
        decimals: typeof decimals === 'number' || typeof decimals === 'string' ? Number(decimals) : null,
        totalSupply: totalSupply ? formatAmount(totalSupply.toString(), typeof decimals === 'number' || typeof decimals === 'string' ? Number(decimals) : 6) : null,
        tokenUri: typeof tokenUri === 'string' ? tokenUri : null,
        userBalance: userBalance ? formatAmount(userBalance.toString(), typeof decimals === 'number' || typeof decimals === 'string' ? Number(decimals) : 6) : null
      });
      
    } catch (error) {
      console.error('Error fetching token details:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch token details. See console for more information.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to call read-only functions on a Stacks contract
  const callReadOnlyFunction = async (contractAddress: string, functionName: string, args: any[] = []) => {
    try {
      if (contractAddress.includes('.')) {
        const [contractAddr, contractName] = contractAddress.split('.');
        
        // @ts-ignore - Type definitions aren't fully available
        const result = await request('call_read_only_function', {
          contractAddress: contractAddr,
          contractName,
          functionName,
          functionArgs: args,
          network: networkConfig?.isTestnet ? 'testnet' : 'mainnet'
        });
        
        return result;
      }
      return null;
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      return null;
    }
  };
  
  // Parse response from read-only function
  const parseResponse = (response: any) => {
    if (!response) return null;
    
    // Different possible response formats
    if (response.value) {
      return response.value;
    }
    
    if (response.result) {
      return response.result;
    }
    
    // For newer @stacks/connect formats
    if (response.data && response.data.value) {
      return response.data.value;
    }
    
    return response;
  };
  
  // Helper to format amounts with proper decimals
  const formatAmount = (amount: string, decimals: number): string => {
    if (!amount) return '0';
    
    try {
      const value = BigInt(amount);
      // Calculate divisor using manual multiplication instead of exponentiation
      let divisor = BigInt(1);
      for (let i = 0; i < decimals; i++) {
        divisor = divisor * BigInt(10);
      }
      
      const integerPart = value / divisor;
      const fractionalPart = value % divisor;
      
      let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      // Trim trailing zeros
      fractionalStr = fractionalStr.replace(/0+$/, '');
      
      return fractionalStr ? `${integerPart}.${fractionalStr}` : integerPart.toString();
    } catch (error) {
      console.error('Error formatting amount:', error);
      return '0';
    }
  };
  
  // Fetch token details on mount and when contract address changes
  useEffect(() => {
    if (contractAddress) {
      fetchTokenDetails();
    }
  }, [contractAddress]);
  
  const getExplorerUrl = (address: string) => {
    const baseUrl = networkConfig?.explorerUrl || 'https://explorer.hiro.so';
    const chainParam = networkConfig?.isTestnet ? '?chain=testnet' : '';
    return `${baseUrl}/address/${address}${chainParam}`;
  };
  
  return (
    <Card className="bg-gradient-to-br from-blue-900/20 via-gray-900 to-gray-900 border border-blue-600/30 p-6 shadow-lg mt-6">
      <h3 className="text-xl font-semibold text-white mb-4">Token Details</h3>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-400">Contract Address</h4>
              <div className="flex items-center mt-1">
                <p className="text-sm font-mono text-white truncate">{contractAddress}</p>
                <Button 
                  variant="ghost"
                  className="h-6 w-6 ml-1" 
                  onClick={() => copyToClipboard(contractAddress, 'Contract address copied to clipboard')}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost"
                  className="h-6 w-6" 
                  onClick={() => window.open(getExplorerUrl(contractAddress), '_blank')}
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Token Name</h4>
              <p className="text-sm text-white mt-1">{tokenDetails.name || '—'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Token Symbol</h4>
              <p className="text-sm text-white mt-1">{tokenDetails.symbol || '—'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Decimals</h4>
              <p className="text-sm text-white mt-1">{tokenDetails.decimals !== null ? tokenDetails.decimals : '—'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Total Supply</h4>
              <p className="text-sm text-white mt-1">{tokenDetails.totalSupply || '—'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Your Balance</h4>
              <p className="text-sm text-white mt-1">{tokenDetails.userBalance || '—'}</p>
            </div>
            
            {tokenDetails.tokenUri && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-400">Token URI</h4>
                <div className="flex items-center mt-1">
                  <p className="text-sm font-mono text-white truncate">{tokenDetails.tokenUri}</p>
                  <Button 
                    variant="ghost"
                    className="h-6 w-6 ml-1" 
                    onClick={() => copyToClipboard(tokenDetails.tokenUri || '', 'Token URI copied to clipboard')}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                  {tokenDetails.tokenUri.startsWith('http') && (
                    <Button 
                      variant="ghost"
                      className="h-6 w-6" 
                      onClick={() => window.open(tokenDetails.tokenUri || '', '_blank')}
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center mt-4">
            <Button 
              onClick={fetchTokenDetails} 
              variant="secondary"
              className="text-blue-400 border border-blue-400 hover:bg-blue-900/20"
            >
              Refresh Token Data
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
} 