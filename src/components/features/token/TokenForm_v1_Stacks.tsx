import React, { useState, useRef, useEffect } from 'react';
import { useStacksWallet } from '@/contexts/StacksWalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { cn } from '@/utils/cn';
import { parseUnits } from 'ethers';
import { request } from '@stacks/connect';
import { TokenURIGenerator } from './TokenURIGenerator';
import StacksTokenDetails from './StacksTokenDetails';

// Define the LeatherProvider interface
declare global {
  interface Window {
    LeatherProvider?: {
      getProductInfo?: () => Promise<any>;
      transactionRequest?: (encodedPayload: string) => Promise<any>;
    }
  }
}

// Simple styling
const inputClasses = "mt-2 block w-full rounded-md border-gray-800 !bg-gray-900 text-white placeholder-gray-500 focus:!bg-gray-900 focus:ring-0 focus:border-gray-700 focus:text-white hover:!bg-gray-900 active:!bg-gray-900 px-2 py-1 shadow-[-webkit-box-shadow:0_0_0_1000px_#111827_inset]";
const labelClasses = "block text-sm font-medium text-gray-300";
const CLARITY_TEMPLATE_PATH = '/clarity/sip010-ft-standard.clar';
const STACKS_DECIMALS = 6;

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  tokenUri: string;
  contractName: string;
}

interface FeeStats {
  totalCollected: number;
  locked: number;
  available: number;
}

interface Props {}

// Define the deposit address from env
const DEPLOYMENT_FEE_ADDRESS = process.env.NEXT_PUBLIC_STX_FEE_ADDRESS || "ST1M4XB0KP2FPT1NFQQWV0MR3CE5SP2B3P4ZK9ZSR";

// Set fixed deployment fee of 1 STX
const DEPLOYMENT_FEE_AMOUNT = "1000000"; // 1 STX in microstacks
const DEPLOYMENT_FEE_DISPLAY = "1"; // 1 STX
const estimatedFeeText = `${DEPLOYMENT_FEE_DISPLAY} STX`;

export default function TokenForm_v1_Stacks({}: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    initialSupply: '',
    tokenUri: '',
    contractName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ txId: string, contractAddress: string } | null>(null);
  const { isConnected: isStacksConnected, address: stacksAddress, networkConfig } = useStacksWallet();
  const { toast } = useToast();
  const [isWalletRetry, setIsWalletRetry] = useState(false);
  const deployOptionsRef = useRef<any>(null);
  const [feeStats, setFeeStats] = useState<FeeStats | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTokenURIGenerated = (uri: string) => {
    setFormData(prev => ({ ...prev, tokenUri: uri }));
    toast({
      title: "Token URI Set",
      description: "The generated URI has been added to your token form."
    });
  };
  
  const fetchClarityTemplate = async (): Promise<string> => {
    try {
      const response = await fetch(CLARITY_TEMPLATE_PATH);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.text();
    } catch (e) {
      console.error("Failed to fetch Clarity template:", e);
      throw new Error("Could not load contract template.");
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStacksConnected || !stacksAddress) {
      toast({ 
        variant: "destructive", 
        title: "Wallet Error", 
        description: "Please connect your Stacks wallet first." 
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);
    setIsWalletRetry(false);

    try {
      // Simple direct fee transfer
      console.log("[Fee] Initiating direct fee transfer...");
      const feeResponse = await request('stx_transferStx', {
        recipient: DEPLOYMENT_FEE_ADDRESS,
        amount: DEPLOYMENT_FEE_AMOUNT,
        memo: "TokenHub deployment fee",
      });

      if (!feeResponse || !feeResponse.txid) {
        throw new Error("Fee transfer failed");
      }

      console.log("[Fee] Transfer successful:", feeResponse.txid);

      // Continue with token deployment
      // 1. Fetch Clarity Code
      let clarityCode = await fetchClarityTemplate();
      console.log("[Deploy] Fetched template:", clarityCode.substring(0, 100) + "...");

      // 2. Prepare and Validate Inputs
      const name = formData.name.trim();
      const symbol = formData.symbol.trim().toUpperCase();
      const initialSupplyRaw = formData.initialSupply.replace(/,/g, '');
      const tokenUri = formData.tokenUri.trim();

      // Basic Input Validations
      if (!name || name.length > 20) 
        throw new Error("Invalid Token Name (max 20 chars)");
      if (!symbol || symbol.length > 10) 
        throw new Error("Invalid Token Symbol (max 10 chars)");
      if (!initialSupplyRaw || isNaN(parseFloat(initialSupplyRaw)) || parseFloat(initialSupplyRaw) <= 0) 
        throw new Error("Invalid Initial Supply (must be a positive number)");
      
      // Calculate values
      const initialSupplyUnits = BigInt(parseUnits(initialSupplyRaw, STACKS_DECIMALS).toString());
      
      // 3. Replace placeholders
      clarityCode = clarityCode.replace(/"\{TOKEN_NAME\}"/g, `"${name}"`);
      clarityCode = clarityCode.replace(/"\{TOKEN_SYMBOL\}"/g, `"${symbol}"`);
      clarityCode = clarityCode.replace(/u\{TOKEN_DECIMALS\}/g, `u${STACKS_DECIMALS}`);
      clarityCode = clarityCode.replace(/u\{INITIAL_SUPPLY\}/g, `u${initialSupplyUnits.toString()}`);
      
      // Properly format the token URI - it needs to be either (some u"uri") or none
      const formattedTokenUri = tokenUri ? `(some u"${tokenUri}")` : `none`;
      clarityCode = clarityCode.replace(/\{TOKEN_URI\}/g, formattedTokenUri);
      
      // Debug replacements
      console.log("[Deploy] Token URI Replacement:", {
        tokenUri,
        formattedTokenUri,
        replacementDone: clarityCode.includes(formattedTokenUri)
      });
      
      // Generate a super simple contract name with small random suffix
      let contractName = '';
      
      if (formData.contractName && formData.contractName.trim() !== '') {
        // Use user-provided name, but keep it minimal
        contractName = formData.contractName.toLowerCase().replace(/[^a-z0-9]+/g, '');
        // Ensure it starts with a letter
        if (!/^[a-z]/.test(contractName)) {
          contractName = 'token';
        }
      } else {
        // Just use a simple default
        contractName = 'token';
      }
      
      // Add a short suffix to avoid conflicts
      const shortSuffix = Math.floor(Math.random() * 10).toString();
      contractName = `${contractName}${shortSuffix}`;
      
      console.log("[Deploy] Using simple contract name:", contractName);
      
      console.log("[Deploy] Modified template (first 100 chars):", clarityCode.substring(0, 100) + "...");
      console.log("[Deploy] Initiating deployment...");
      
      // Store critical data for retry if needed
      deployOptionsRef.current = {
        contractName,
        codeBody: clarityCode,
        appDetails: {
          name: "TokenHub",
          icon: window.location.origin + '/logo.png'
        }
      };
      
      // 4. Deploy using the modern request API method
      console.log("[Deploy] Using modern request API for contract deployment");
      
      try {
        console.log("[Deploy] Starting contract deployment with params:", {
          contractName,
          codeLength: clarityCode.length,
        });
        
        // Deploy contract using modern @stacks/connect
        // @ts-ignore - The type definitions for stx_deployContract params are not properly exposed
        const deployParams = {
          name: contractName,
          clarityCode: clarityCode
        };
        
        const response = await request('stx_deployContract', deployParams);
        
        console.log("[Deploy] Deployment response:", response);
        
        if (response && response.txid) {
          const deployedContractAddress = `${stacksAddress}.${contractName}`;
          setSuccessInfo({ 
            txId: response.txid, 
            contractAddress: deployedContractAddress 
          });
          toast({ 
            title: "Transaction Submitted!", 
            description: `Transaction ID: ${response.txid.slice(0, 10)}... (Note: It may take a few minutes to confirm)` 
          });
        } else {
          throw new Error("No transaction ID returned from wallet");
        }
      } catch (err) {
        console.error("[Deploy] Error in contract deployment request:", err);
        setError(`Deployment failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        toast({ 
          variant: "destructive", 
          title: "Deployment Error", 
          description: "Failed to deploy contract. Check console for details." 
        });
      }
      
    } catch (err: any) {
      console.error("[Deploy] Error:", err);
      setError(err.message || "An unknown error occurred");
      toast({ 
        variant: "destructive", 
        title: "Deployment Error", 
        description: err.message 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to construct explorer URL
  const getStacksExplorerTxUrl = (txId: string): string | null => {
    if (!networkConfig) return null;
    const baseUrl = 'https://explorer.hiro.so';
    const chainParam = networkConfig.isTestnet ? '?chain=testnet' : '';
    
    // Correctly format the URL
    if (txId.includes('.')) {
      // This is a contract address
      return `${baseUrl}/address/${txId}${chainParam}`;
    } else {
      // This is a transaction ID
      return `${baseUrl}/txid/${txId}${chainParam}`;
    }
  };

  // Add function to fetch fee stats
  const fetchFeeStats = async () => {
    try {
      const response = await callReadOnlyFunction({
        contractAddress: DEPLOYMENT_FEE_ADDRESS,
        contractName: 'batch-token-factory',
        functionName: 'get-fee-stats',
        network: networkConfig?.network
      });

      if (response.success) {
        setFeeStats({
          totalCollected: Number(response.value.totalCollected) / 1000000,
          locked: Number(response.value.locked) / 1000000,
          available: Number(response.value.available) / 1000000
        });
      }
    } catch (err) {
      console.error('Failed to fetch fee stats:', err);
    }
  };

  // Fetch stats on mount and after transactions
  useEffect(() => {
    if (isStacksConnected) {
      fetchFeeStats();
    }
  }, [isStacksConnected, successInfo]);

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 via-gray-900 to-gray-900 border border-purple-600/30 p-6 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name" className={labelClasses}>Token Name</Label>
            <Input 
              id="name" 
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="e.g., My Stacks Token"
              maxLength={20}
              required 
            />
          </div>
          <div>
            <Label htmlFor="symbol" className={labelClasses}>Token Symbol</Label>
            <Input 
              id="symbol" 
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="e.g., MST" 
              maxLength={10}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="initialSupply" className={labelClasses}>Initial Supply</Label>
            <Input 
              id="initialSupply" 
              name="initialSupply"
              type="text"
              value={formData.initialSupply}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="e.g., 1000000"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              This amount (with 6 decimals) will be minted to your connected wallet.
            </p>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="tokenUri" className={labelClasses}>Token URI (Optional)</Label>
            <div className="flex gap-2">
              <Input 
                id="tokenUri"
                name="tokenUri"
                value={formData.tokenUri}
                onChange={handleInputChange}
                className={cn(inputClasses, "flex-grow")}
                placeholder="e.g., https://example.com/my-token-metadata.json"
              />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-400">
                A URL pointing to metadata (name, image, description).
              </p>
              <TokenURIGenerator 
                tokenName={formData.name}
                tokenSymbol={formData.symbol}
                onURIGenerated={handleTokenURIGenerated}
              />
            </div>
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="contractName" className={labelClasses}>Contract Name (Optional)</Label>
            <div className="flex gap-2">
              <Input 
                id="contractName"
                name="contractName"
                value={formData.contractName}
                onChange={handleInputChange}
                className={cn(inputClasses, "flex-grow")}
                placeholder="e.g., mytoken (lowercase, no spaces)"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Custom name for your contract. Must be lowercase letters, numbers, and hyphens.
              If left empty, we'll generate one based on your token symbol.
            </p>
          </div>
        </div>

        {/* Fee Status Display */}
        {feeStats && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Fee Status</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Total Collected:</span>
                <span>{feeStats.totalCollected.toFixed(2)} STX</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Locked (Network Ops):</span>
                <span>{feeStats.locked.toFixed(2)} STX</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Available:</span>
                <span>{feeStats.available.toFixed(2)} STX</span>
              </div>
            </div>
          </div>
        )}

        {/* Deployment Fee & Submit Button */} 
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-300">Deployment Fee:</span>
            <span className="text-sm font-semibold text-white">{estimatedFeeText}</span>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            disabled={isLoading || !isStacksConnected}
          >
            {isLoading ? <Spinner /> : 'Deploy Stacks Token'}
          </Button>
        </div>

        {/* Error Message */} 
        {error && (
          <div className="mt-4 text-center text-red-400 border border-red-400/50 bg-red-900/20 p-3 rounded-md">
            {error}
            {isWalletRetry && (
              <Button 
                type="button" 
                onClick={() => {
                  try {
                    request('stx_deployContract', {
                      name: deployOptionsRef.current.contractName,
                      clarityCode: deployOptionsRef.current.codeBody,
                    });
                    console.log("[Deploy] Manual retry: request called");
                  } catch (err) {
                    console.error("[Deploy] Manual retry error:", err);
                    toast({ 
                      variant: "destructive", 
                      title: "Deployment Error", 
                      description: "Failed to open wallet. Please try again later."
                    });
                  }
                }}
                className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700"
              >
                Try Again with Wallet
              </Button>
            )}
          </div>
        )}

        {/* Success Message */} 
        {successInfo && (
          <div className="mt-4 text-center text-green-400 border border-green-400/50 bg-green-900/20 p-3 rounded-md space-y-2">
            <p>Token Deployment Submitted!</p>
            <p className="text-xs">
              Contract Address (Pending Confirmation): 
              <span className="font-mono ml-1 break-all">{successInfo.contractAddress}</span>
            </p>
            {(() => {
              const explorerUrl = getStacksExplorerTxUrl(successInfo.txId);
              return explorerUrl ? (
                <a 
                  href={explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline block"
                >
                  View Transaction on Explorer (TxID: {successInfo.txId.slice(0, 10)}...)
                </a>
              ) : null;
            })()}
            
            {/* Token Details Component */}
            <StacksTokenDetails contractAddress={successInfo.contractAddress} />
          </div>
        )}
      </form>
    </Card>
  );
} 