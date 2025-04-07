import React, { useState, useEffect } from 'react';
import { useStacksWallet } from '@/contexts/StacksWalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { 
  AnchorMode, 
  PostConditionMode 
} from '@stacks/transactions';
import { 
  openContractDeploy
} from '@stacks/connect';
import { cn } from '@/utils/cn';
import { parseUnits } from 'ethers';

const inputClasses = "mt-2 block w-full rounded-md border-gray-800 !bg-gray-900 text-white placeholder-gray-500 focus:!bg-gray-900 focus:ring-0 focus:border-gray-700 hover:!bg-gray-900 active:!bg-gray-900";
const labelClasses = "block text-sm font-medium text-gray-300";
const CLARITY_TEMPLATE_PATH = '/clarity/sip010-ft-standard.clar';
const STACKS_DECIMALS = 6;

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  tokenUri: string;
}

interface Props {}

export default function TokenForm_v1_Stacks({}: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    initialSupply: '',
    tokenUri: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ txId: string, contractAddress: string } | null>(null);
  const { isConnected: isStacksConnected, address: stacksAddress, networkConfig, userSession } = useStacksWallet();
  const { toast } = useToast();
  const [estimatedFee] = useState<string>('~0.1 STX'); // Keep placeholder fee

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (!isStacksConnected || !stacksAddress || !userSession || !networkConfig) {
      toast({ variant: "destructive", title: "Wallet/Network Error", description: "Please ensure your Stacks wallet is connected and network info is available." });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      // 1. Fetch Clarity Code
      let clarityCode = await fetchClarityTemplate();

      // 2. Prepare and Validate Inputs
      const name = formData.name.trim();
      const symbol = formData.symbol.trim().toUpperCase();
      const initialSupplyRaw = formData.initialSupply.replace(/,/g, '');
      const tokenUri = formData.tokenUri.trim();

      // Basic Input Validations (keep as before)
      if (!name || name.length > 20 || !/^[a-zA-Z0-9\s-]+$/.test(name)) throw new Error("Invalid Token Name (max 20 chars, letters, numbers, spaces, hyphens).");
      if (!symbol || symbol.length > 10 || !/^[A-Z0-9]+$/.test(symbol)) throw new Error("Invalid Token Symbol (max 10 chars, uppercase letters, numbers).");
      if (!initialSupplyRaw || isNaN(parseFloat(initialSupplyRaw)) || parseFloat(initialSupplyRaw) <= 0) throw new Error("Invalid Initial Supply (must be a positive number).");
      
      const initialSupplyUnits = BigInt(parseUnits(initialSupplyRaw, STACKS_DECIMALS).toString());
      const contractName = `${symbol.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-ft-${Date.now().toString().slice(-4)}`;
      if (contractName.length > 40) throw new Error("Generated contract name too long.");

      // Replace placeholders
      clarityCode = clarityCode.replace(/"{TOKEN_NAME}"/g, `"${name}"`);
      clarityCode = clarityCode.replace(/"{TOKEN_SYMBOL}"/g, `"${symbol}"`);
      clarityCode = clarityCode.replace(/u{TOKEN_DECIMALS}/g, `u${STACKS_DECIMALS}`);
      clarityCode = clarityCode.replace(/u{INITIAL_SUPPLY}/g, `u${initialSupplyUnits.toString()}`);
      if (tokenUri) {
        clarityCode = clarityCode.replace(/{TOKEN_URI}/g, `(some u"${tokenUri}")`);
      } else {
        clarityCode = clarityCode.replace(/{TOKEN_URI}/g, `none`);
      }

      // 3. Setup Transaction Options (No network property)
      const txOptions = {
        contractName: contractName,
        codeBody: clarityCode,
        anchorMode: AnchorMode.Any,
        appDetails: {
          name: "TokenHub.dev",
          icon: window.location.origin + '/logo.png'
        },
        onFinish: (data: any) => {
          console.log("[Stacks Deploy] onFinish called. Data:", data);
          const deployedContractAddress = `${stacksAddress}.${contractName}`;
          setSuccessInfo({ txId: data.txId, contractAddress: deployedContractAddress });
          toast({ title: "Transaction Broadcast!", description: `TxID: ${data.txId.slice(0, 10)}...` });
          console.log("[Stacks Deploy] Setting isLoading to false in onFinish.");
          setIsLoading(false);
        },
        onCancel: () => {
          console.log("[Stacks Deploy] onCancel called.");
          toast({ variant: "default", title: "Transaction Cancelled" });
          console.log("[Stacks Deploy] Setting isLoading to false in onCancel.");
          setIsLoading(false); 
        }
      };

      // 4. Open transaction popup
      console.log("[Stacks Deploy] Calling openContractDeploy with options:", txOptions);
      await openContractDeploy(txOptions);
      console.log("[Stacks Deploy] openContractDeploy promise resolved (Note: may resolve before onFinish/onCancel)."); // Added log after await

    } catch (err: any) {
      console.error("[Stacks Deploy] Error in handleSubmit catch block:", err);
      const message = err.message || 'An unknown error occurred';
      setError(`Deployment Failed: ${message}`);
      toast({ variant: "destructive", title: "Deployment Failed", description: message });
      console.log("[Stacks Deploy] Setting isLoading to false in catch block.");
      setIsLoading(false);
    }
  };

  // Helper to construct explorer URL manually
  const getStacksExplorerTxUrl = (txId: string): string | null => {
    if (!networkConfig) return null;
    // Basic construction, assumes explorer URL ends with /
    // and transaction path is txid/<txId>
    // e.g., https://explorer.stacks.co/txid/0x... or https://explorer.stacks.co/txid/0x...?chain=testnet
    const baseUrl = networkConfig.explorerUrl;
    const chainParam = networkConfig.isTestnet ? '?chain=testnet' : '';
    // Ensure baseUrl doesn't have trailing slash if we add one
    const separator = baseUrl.endsWith('/') ? '' : '/';
    return `${baseUrl}${separator}txid/${txId}${chainParam}`;
  };

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
              maxLength={20} // Based on contract constant
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
              maxLength={10} // Based on contract constant
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="initialSupply" className={labelClasses}>Initial Supply</Label>
            <Input 
              id="initialSupply" 
              name="initialSupply"
              type="number" // Consider using text for large numbers
              value={formData.initialSupply}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="e.g., 1000000"
              step="any"
              required
            />
            <p className="text-xs text-gray-400 mt-1">This amount (with 6 decimals) will be minted to your connected wallet ({stacksAddress ? `${stacksAddress.slice(0,5)}...${stacksAddress.slice(-4)}` : '...'}).</p>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="tokenUri" className={labelClasses}>Token URI (Optional)</Label>
            <Input 
              id="tokenUri"
              name="tokenUri"
              value={formData.tokenUri}
              onChange={handleInputChange}
              className={inputClasses}
              placeholder="e.g., https://example.com/my-token-metadata.json"
            />
            <p className="text-xs text-gray-400 mt-1">A URL pointing to a JSON file with metadata (name, image, description).</p>
          </div>
        </div>

        {/* Deployment Fee & Submit Button */} 
        <div className="border-t border-gray-700 pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-300">Estimated Fee:</span>
            <span className="text-sm font-semibold text-white">{estimatedFee}</span>
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
          </div>
        )}
      </form>
    </Card>
  );
} 