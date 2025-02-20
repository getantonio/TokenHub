import { useState } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { FACTORY_ABI } from '@/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep';
import { TOKEN_FACTORY_V2_BAKE_ADDRESS } from '@/config/contracts';
import { ChainId } from '@/types/chain';

interface ListTokenProps {
  tokenAddress?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ListToken({ tokenAddress: initialTokenAddress, onSuccess, onError }: ListTokenProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isResettingApproval, setIsResettingApproval] = useState(false);
  
  const [listingParams, setListingParams] = useState({
    tokenAddress: initialTokenAddress || '',
    initialLiquidity: '0.1',
    listingPrice: '0.0001',
    liquidityPercentage: '20'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setListingParams(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset approval state when token address changes
    if (name === 'tokenAddress') {
      setIsApproved(false);
    }
  };

  const handleApprove = async () => {
    if (!window.ethereum) {
      toast({
        title: "Error",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsApproving(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = chainId ? TOKEN_FACTORY_V2_BAKE_ADDRESS[chainId as ChainId] : undefined;
      if (!factoryAddress) {
        throw new Error('Factory address not found for this network. Please switch to a supported network.');
      }

      console.log('Debug Info:', {
        chainId,
        factoryAddress,
        userAddress: await signer.getAddress(),
        tokenAddress: listingParams.tokenAddress
      });
      
      const token = new ethers.Contract(
        listingParams.tokenAddress,
        [
          'function totalSupply() view returns (uint256)',
          'function balanceOf(address) view returns (uint256)',
          'function allowance(address,address) view returns (uint256)',
          'function approve(address,uint256) returns (bool)',
          'function owner() view returns (address)'
        ],
        signer
      );

      // Verify token ownership
      const tokenOwner = await token.owner();
      if (tokenOwner.toLowerCase() !== (await signer.getAddress()).toLowerCase()) {
        throw new Error(`Not token owner. Owner is ${tokenOwner}`);
      }

      // Calculate tokens needed for liquidity
      const totalSupply = await token.totalSupply();
      const tokensForLiquidity = (totalSupply * BigInt(listingParams.liquidityPercentage)) / BigInt(100);

      console.log('Liquidity Info:', {
        totalSupply: ethers.formatEther(totalSupply),
        tokensForLiquidity: ethers.formatEther(tokensForLiquidity),
        liquidityPercentage: listingParams.liquidityPercentage
      });

      // Check token balance
      const tokenBalance = await token.balanceOf(await signer.getAddress());
      if (tokenBalance < tokensForLiquidity) {
        throw new Error(`Insufficient token balance. Need ${ethers.formatEther(tokensForLiquidity)} tokens`);
      }

      // Approve tokens
      console.log('Approving tokens...');
      const approveTx = await token.approve(factoryAddress, tokensForLiquidity);
      await approveTx.wait();
      
      setIsApproved(true);
      toast({
        title: "Success",
        description: "Token approval confirmed",
      });

    } catch (error) {
      console.error('Approval Error:', error);
      let errorMessage = "Failed to approve tokens";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsApproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!window.ethereum) {
      toast({
        title: "Error",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = chainId ? TOKEN_FACTORY_V2_BAKE_ADDRESS[chainId as ChainId] : undefined;
      if (!factoryAddress) {
        throw new Error('Factory address not found for this network. Please switch to a supported network.');
      }

      // Create contract instances
      const factory = new ethers.Contract(
        factoryAddress,
        FACTORY_ABI,
        signer
      );
      
      // Get listing fee
      const listingFee = await factory.getListingFee();
      console.log('Listing fee:', ethers.formatEther(listingFee), 'ETH');
      
      // Calculate total value needed
      const initialLiquidity = ethers.parseEther(listingParams.initialLiquidity);
      const totalValue = initialLiquidity + listingFee;

      // Check ETH balance
      const ethBalance = await provider.getBalance(await signer.getAddress());
      if (ethBalance < totalValue) {
        throw new Error(`Insufficient ETH balance. Need ${ethers.formatEther(totalValue)} ETH`);
      }

      // Check if token is already listed
      const isListed = await factory.isListed(listingParams.tokenAddress);
      if (isListed) {
        throw new Error('Token is already listed');
      }

      // List token
      console.log('Listing token with params:', {
        tokenAddress: listingParams.tokenAddress,
        initialLiquidity: ethers.formatEther(initialLiquidity),
        listingPrice: listingParams.listingPrice,
        dexName: 'uniswap-test',
        liquidityPercentage: listingParams.liquidityPercentage
      });

      // Convert liquidityPercentage to the correct format (20 instead of "20")
      const liquidityPercentage = parseInt(listingParams.liquidityPercentage);
      
      // Check if DEX is active
      const dexInfo = await factory.getDEXRouter('uniswap');
      console.log('DEX Info:', {
        name: 'uniswap',
        router: dexInfo.router,
        isActive: dexInfo.isActive
      });

      if (!dexInfo.isActive) {
        throw new Error('Selected DEX is not active');
      }

      console.log('Debug - Contract call params:', {
        tokenAddress: listingParams.tokenAddress,
        initialLiquidity: initialLiquidity.toString(),
        listingPrice: ethers.parseEther(listingParams.listingPrice).toString(),
        dexName: 'uniswap-test',
        liquidityPercentage: liquidityPercentage,
        value: totalValue.toString()
      });

      const listTx = await factory.listTokenOnDEX(
        listingParams.tokenAddress,
        ethers.parseEther(listingParams.initialLiquidity),
        ethers.parseEther(listingParams.listingPrice),
        'uniswap-test',
        parseInt(listingParams.liquidityPercentage),
        { value: totalValue }
      );
      
      console.log('Listing transaction submitted:', listTx.hash);
      await listTx.wait();
      
      toast({
        title: "Success",
        description: "Token listed successfully!",
      });
      
      onSuccess?.();

    } catch (error) {
      console.error('Listing Error:', error);
      let errorMessage = "Failed to list token";
      
      if (error instanceof Error) {
        // Extract revert reason if available
        if (error.message.includes('reason=')) {
          const match = error.message.match(/reason="([^"]+)"/);
          errorMessage = match ? match[1] : error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetApproval = async () => {
    if (!window.ethereum || !chainId || !listingParams.tokenAddress) {
      toast({
        title: "Error",
        description: "Please connect wallet and enter token address",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsResettingApproval(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = chainId ? TOKEN_FACTORY_V2_BAKE_ADDRESS[chainId as ChainId] : undefined;
      if (!factoryAddress) {
        throw new Error('Factory address not found for this network');
      }

      const token = new ethers.Contract(
        listingParams.tokenAddress,
        [
          'function approve(address,uint256) returns (bool)',
          'function allowance(address,address) view returns (uint256)'
        ],
        signer
      );

      // Reset approval by setting it to 0
      console.log('Resetting token approval...');
      const resetTx = await token.approve(factoryAddress, 0);
      await resetTx.wait();
      
      setIsApproved(false);
      toast({
        title: "Success",
        description: "Token approval has been reset",
      });

    } catch (error) {
      console.error('Reset Approval Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset approval",
        variant: "destructive"
      });
    } finally {
      setIsResettingApproval(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tokenAddress" className="text-text-primary">Token Address</Label>
        <Input
          id="tokenAddress"
          name="tokenAddress"
          value={listingParams.tokenAddress}
          onChange={handleInputChange}
          className="bg-gray-900 text-text-primary border-gray-700"
          placeholder="Enter token address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="initialLiquidity" className="text-text-primary">Initial Liquidity (ETH)</Label>
          <Input
            id="initialLiquidity"
            name="initialLiquidity"
            type="number"
            step="0.000000000000000001"
            value={listingParams.initialLiquidity}
            onChange={handleInputChange}
            className="bg-gray-900 text-text-primary border-gray-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="listingPrice" className="text-text-primary">Listing Price (ETH)</Label>
          <Input
            id="listingPrice"
            name="listingPrice"
            type="number"
            step="0.000000000000000001"
            value={listingParams.listingPrice}
            onChange={handleInputChange}
            className="bg-gray-900 text-text-primary border-gray-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="liquidityPercentage" className="text-text-primary">Liquidity Percentage (%)</Label>
        <Input
          id="liquidityPercentage"
          name="liquidityPercentage"
          type="number"
          min="1"
          max="100"
          value={listingParams.liquidityPercentage}
          onChange={handleInputChange}
          className="bg-gray-900 text-text-primary border-gray-700"
        />
      </div>

      <div className="flex gap-2">
        {!isApproved ? (
          <Button 
            type="button"
            onClick={handleApprove}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isApproving || !isConnected || !listingParams.tokenAddress}
          >
            {isApproving ? (
              <>
                <Spinner className="mr-2" />
                Approving...
              </>
            ) : !isConnected ? (
              "Connect Wallet"
            ) : !listingParams.tokenAddress ? (
              "Enter Token Address"
            ) : (
              "Step 1: Approve Token"
            )}
          </Button>
        ) : (
          <Button 
            type="submit" 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
            disabled={isLoading || !isConnected}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Listing Token...
              </>
            ) : !isConnected ? (
              "Connect Wallet"
            ) : (
              "Step 2: List to DEX"
            )}
          </Button>
        )}

        <Button
          type="button"
          onClick={handleResetApproval}
          className="bg-red-600 hover:bg-red-700 text-white"
          disabled={isResettingApproval || !isConnected || !listingParams.tokenAddress}
        >
          {isResettingApproval ? (
            <>
              <Spinner className="mr-2" />
              Resetting...
            </>
          ) : (
            "Reset Approval"
          )}
        </Button>
      </div>
    </form>
  );
} 