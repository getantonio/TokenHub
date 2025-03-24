"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { 
  Contract, 
  formatUnits, 
  parseUnits, 
  parseEther,
  BrowserProvider,
  hexlify
} from 'ethers';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { isPolygonAmoyNetwork } from '@/utils/network';
import { useWallet } from '@/components/WalletProvider';

// Define the form schema
const formSchema = z.object({
  tokenAddress: z.string().min(42, 'Token address must be a valid address'),
  tokenAmount: z.string().min(1, 'Amount must be greater than 0'),
  ethAmount: z.string().min(1, 'ETH amount must be greater than 0'),
});

type FormData = z.infer<typeof formSchema>;

export default function TokenFormLiquidity() {
  const { provider, isConnected, connectWallet } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    balance: string;
    modules: { type: string; address: string }[];
  } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenAddress: '',
      tokenAmount: '0',
      ethAmount: '0.01',
    },
  });

  // Function to look up token info
  const lookupToken = async (tokenAddress: string) => {
    if (!provider || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setLookingUp(true);
    try {
      const { chainId } = await provider.getNetwork();
      
      // Validate for Polygon Amoy
      if (!isPolygonAmoyNetwork(Number(chainId))) {
        toast({
          title: "Wrong Network",
          description: "Please switch to Polygon Amoy network",
          variant: "destructive",
        });
        setLookingUp(false);
        return;
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Token ABI for basic info
      const tokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function getModules() view returns (address[])"
      ];

      const token = new Contract(tokenAddress, tokenABI, signer);
      
      // Get token details
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const balance = await token.balanceOf(userAddress);

      // Get modules 
      const modules: { type: string; address: string }[] = [];
      try {
        const moduleAddresses = await token.getModules();
        
        // Detect module types
        const moduleTypeABI = ["function getModuleType() view returns (bytes32)"];
        
        for (const moduleAddress of moduleAddresses) {
          try {
            const moduleContract = new Contract(moduleAddress, moduleTypeABI, signer);
            const moduleTypeBytes = await moduleContract.getModuleType();
            
            // Convert bytes32 to string
            const moduleTypeString = Buffer.from(hexlify(moduleTypeBytes).slice(2), 'hex')
              .toString('utf8')
              .replace(/\0/g, '');
            
            modules.push({
              type: moduleTypeString,
              address: moduleAddress,
            });
          } catch (error) {
            console.error("Error detecting module type:", error);
          }
        }
      } catch (error) {
        console.error("Error getting modules:", error);
      }

      // Update token info state
      setTokenInfo({
        name,
        symbol,
        balance: formatUnits(balance, decimals),
        modules,
      });

      // Set default token amount (10% of balance)
      const tenPercent = balance * BigInt(10) / BigInt(100);
      form.setValue('tokenAmount', formatUnits(tenPercent, decimals));

    } catch (error) {
      console.error("Error looking up token:", error);
      toast({
        title: "Token Lookup Failed",
        description: "Could not retrieve token information. Please check the address.",
        variant: "destructive",
      });
    } finally {
      setLookingUp(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (data: FormData) => {
    if (!provider || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { chainId } = await provider.getNetwork();
      const chainIdNumber = Number(chainId);
      
      // Validate for Polygon Amoy
      if (!isPolygonAmoyNetwork(chainIdNumber)) {
        toast({
          title: "Wrong Network",
          description: "Please switch to Polygon Amoy network",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const signer = await provider.getSigner();
      
      // Find liquidity module
      const liquidityModule = tokenInfo?.modules.find(m => m.type === "LIQUIDITY_MODULE");
      
      if (!liquidityModule) {
        toast({
          title: "No Liquidity Module",
          description: "This token does not have a liquidity module",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Get token info
      const tokenABI = [
        "function decimals() view returns (uint8)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];
      
      const token = new Contract(data.tokenAddress, tokenABI, signer);
      const decimals = await token.decimals();
      
      // Convert token amount to wei
      const tokenAmount = parseUnits(data.tokenAmount, decimals);
      const ethAmount = parseEther(data.ethAmount);

      // Approve liquidity module to spend tokens
      const approveTx = await token.approve(liquidityModule.address, tokenAmount);
      
      toast({
        title: "Approving Token Transfer",
        description: "Please wait while the transaction is confirmed...",
      });
      
      await approveTx.wait();
      
      // Now add liquidity
      const liquidityModuleABI = [
        "function addLiquidity(uint256 tokenAmount) payable returns (bool)"
      ];
      
      const liquidityModuleContract = new Contract(
        liquidityModule.address, 
        liquidityModuleABI, 
        signer
      );
      
      // Add liquidity
      const addLiquidityTx = await liquidityModuleContract.addLiquidity(tokenAmount, {
        value: ethAmount
      });
      
      toast({
        title: "Adding Liquidity",
        description: "Please wait while the transaction is confirmed...",
      });
      
      await addLiquidityTx.wait();
      
      toast({
        title: "Liquidity Added Successfully",
        description: "Your liquidity has been added to the pool",
        variant: "default",
      });
      
      // Reset form
      form.reset();
      setTokenInfo(null);
      
    } catch (error: any) {
      console.error("Error adding liquidity:", error);
      toast({
        title: "Error Adding Liquidity",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Add Liquidity to Token</CardTitle>
        <CardDescription>
          Add liquidity to your token to enable trading on DEXes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center">
            <p className="mb-4">Connect your wallet to continue</p>
            <Button onClick={connectWallet}>Connect Wallet</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Token Address Field */}
              <FormField
                control={form.control}
                name="tokenAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Address</FormLabel>
                    <div className="flex space-x-2">
                      <FormControl>
                        <Input 
                          placeholder="Enter token address" 
                          {...field} 
                          disabled={lookingUp || submitting}
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={() => lookupToken(field.value)}
                        disabled={!field.value || lookingUp || submitting}
                      >
                        {lookingUp ? "Looking up..." : "Lookup"}
                      </Button>
                    </div>
                    <FormDescription>
                      Enter the address of your token
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Token Info Display */}
              {tokenInfo && (
                <div className="bg-muted p-4 rounded-md mb-4">
                  <h3 className="font-semibold mb-2">Token Information</h3>
                  <p>Name: {tokenInfo.name}</p>
                  <p>Symbol: {tokenInfo.symbol}</p>
                  <p>Your Balance: {tokenInfo.balance} {tokenInfo.symbol}</p>
                  <div className="mt-2">
                    <h4 className="font-semibold">Modules:</h4>
                    <ul className="list-disc pl-5">
                      {tokenInfo.modules.map((module, index) => (
                        <li key={index}>{module.type}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Token Amount Field */}
              <FormField
                control={form.control}
                name="tokenAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.000001" 
                        placeholder="Enter token amount" 
                        {...field}
                        disabled={!tokenInfo || submitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Amount of tokens to add to liquidity pool
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ETH Amount Field */}
              <FormField
                control={form.control}
                name="ethAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ETH Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="Enter ETH amount" 
                        {...field}
                        disabled={!tokenInfo || submitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Amount of ETH to add to liquidity pool
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={!tokenInfo || submitting}
                className="w-full"
              >
                {submitting ? "Adding Liquidity..." : "Add Liquidity"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
} 