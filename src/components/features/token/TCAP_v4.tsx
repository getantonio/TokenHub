import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ethers } from 'ethers';
import { useToast } from '@/components/ui/toast/use-toast';
import { getExplorerUrl } from '@/config/networks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TCAP_v4Props {
  onAnalyze?: (address: string) => void;
}

export function TCAP_v4({ onAnalyze }: TCAP_v4Props) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [analysisData, setAnalysisData] = useState<null | {
    taxSystem: any;
    tokenomics: any;
    supplyControl: any;
    distribution: any;
  }>(null);
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const features = [
    {
      title: 'Dynamic Tax System',
      items: [
        'Current Buy/Sell Tax Rates',
        'Volume-based Tax Adjustments',
        'Fee Distribution Breakdown',
        'Auto-Liquidity Status'
      ]
    },
    {
      title: 'Tokenomics Engine',
      items: [
        'Buyback Configuration',
        'Burn Mechanism Status',
        'Reward Distribution',
        'Trading Limits'
      ]
    },
    {
      title: 'Supply Control',
      items: [
        'Supply Elasticity Status',
        'Current Supply Metrics',
        'Mint/Burn Limits',
        'Price Thresholds'
      ]
    },
    {
      title: 'Distribution System',
      items: [
        'Airdrop Configuration',
        'Vesting Schedules',
        'Merkle Distribution',
        'Batch Transfer Status'
      ]
    }
  ];

  const handleAnalyze = async () => {
    if (!tokenAddress) return;
    
    try {
      // TODO: Implement contract analysis
      onAnalyze?.(tokenAddress);
    } catch (error) {
      console.error('Error analyzing token:', error);
    }
  };

  const handleAddLiquidityConfirm = async () => {
    if (!tokenAddress || !tokenAmount || !ethAmount) {
      toast({
        title: "Missing Information",
        description: "Please provide token address, token amount, and ETH amount",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create contract instance for V4 token
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          // V4 token functions
          "function addLiquidity(uint256, uint256) payable returns (bool)",
          "function approve(address, uint256) returns (bool)",
          "function balanceOf(address) view returns (uint256)",
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
          "function name() view returns (string)",
          "function totalSupply() view returns (uint256)",
          "function transfer(address, uint256) returns (bool)",
          "function getModules() view returns (address[])"
        ],
        signer
      );

      // Convert amounts to BigInt
      const tokenAmountBN = ethers.parseUnits(tokenAmount, 18);
      const ethAmountBN = ethers.parseUnits(ethAmount, 18);

      // Log parameters for debugging
      console.log("Adding liquidity with params:", {
        tokenAddress,
        tokenAmount: tokenAmountBN.toString(),
        ethAmount: ethAmountBN.toString()
      });

      // First check token balance
      const ownerAddress = await signer.getAddress();
      const balance = await tokenContract.balanceOf(ownerAddress);
      console.log("Token balance:", balance.toString());
      
      if (balance < tokenAmountBN) {
        throw new Error(`Insufficient token balance. You have ${ethers.formatUnits(balance, 18)} tokens.`);
      }

      // Call addLiquidity function with proper parameters
      const tx = await tokenContract.addLiquidity(
        tokenAmountBN,
        ethAmountBN,
        {
          value: ethAmountBN,
          gasLimit: BigInt(3000000)
        }
      );

      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      toast({
        title: "Liquidity Added Successfully",
        description: "Your liquidity has been added to the pool"
      });

      // Close dialog and reset form
      setIsAddLiquidityOpen(false);
      setTokenAmount('');
      setEthAmount('');
      
    } catch (error) {
      console.error("Error adding liquidity:", error);
      toast({
        title: "Failed to Add Liquidity",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOnExplorer = () => {
    if (!tokenAddress) return;
    
    // Get the current network
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_chainId' })
        .then((chainIdHex: string) => {
          const chainId = parseInt(chainIdHex, 16);
          const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
          window.open(explorerUrl, '_blank');
        })
        .catch((error: any) => {
          console.error('Error getting chain ID:', error);
          toast({
            title: "Error",
            description: "Could not determine the current network",
            variant: "destructive"
          });
        });
    }
  };

  return (
    <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Token Contract Analysis</h2>
          <p className="text-sm text-gray-400">Analyze V4 token contracts and verify features</p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
          V4
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-200">Token Address</Label>
          <div className="flex gap-2">
            <Input
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
            <Button
              onClick={handleAnalyze}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Analyze
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        {tokenAddress && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddLiquidityOpen} onOpenChange={setIsAddLiquidityOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30">
                  Add Liquidity
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white" aria-describedby="add-liquidity-dialog-description">
                <DialogHeader>
                  <DialogTitle>Add Liquidity</DialogTitle>
                  <DialogDescription id="add-liquidity-dialog-description">
                    Add liquidity to create a trading pair with your token. Enter the amount of tokens and ETH you want to provide.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="token-amount">Token Amount</Label>
                    <Input
                      id="token-amount"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      placeholder="0.0"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eth-amount">ETH Amount</Label>
                    <Input
                      id="eth-amount"
                      value={ethAmount}
                      onChange={(e) => setEthAmount(e.target.value)}
                      placeholder="0.0"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsAddLiquidityOpen(false)}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddLiquidityConfirm}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Adding..." : "Add Liquidity"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="secondary" className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30" onClick={handleViewOnExplorer}>
              View on Explorer
            </Button>
          </div>
        )}

        {/* Analysis Results */}
        {analysisData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                <h3 className="text-sm font-semibold text-white mb-3">{feature.title}</h3>
                <div className="space-y-2">
                  {feature.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">{item}</span>
                      <Badge variant="outline" className="text-xs">
                        Loading...
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Enter a token address to analyze its features</p>
          </div>
        )}
      </div>
    </Card>
  );
} 