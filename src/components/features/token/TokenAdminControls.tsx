import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract, BrowserProvider, formatEther, parseEther } from 'ethers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { useNetwork } from '@/contexts/NetworkContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Token V2 ABI for admin functions
const TOKEN_ADMIN_ABI = [
  // Emergency Controls
  "function pause() external",
  "function unpause() external",
  "function setBlacklist(address account, bool blacklisted) external",
  // Fee Management
  "function setTaxes(uint256 marketingFee, uint256 developmentFee, uint256 autoLiquidityFee) external",
  "function setWallets(address marketing, address development, address autoLiquidity) external",
  // Trading Controls
  "function enableTrading() external",
  "function setMaxTxAmount(uint256 amount) external",
  "function setMaxWalletAmount(uint256 amount) external",
  "function setTradingStartTime(uint256 timestamp) external",
  // View Functions
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function marketingFeePercentage() view returns (uint256)",
  "function developmentFeePercentage() view returns (uint256)",
  "function autoLiquidityFeePercentage() view returns (uint256)",
  "function marketingWallet() view returns (address)",
  "function developmentWallet() view returns (address)",
  "function autoLiquidityWallet() view returns (address)",
  "function maxTxAmount() view returns (uint256)",
  "function maxWalletAmount() view returns (uint256)",
  "function tradingEnabled() view returns (bool)",
  "function tradingStartTime() view returns (uint256)"
];

interface TokenAdminState {
  isOwner: boolean;
  isPaused: boolean;
  marketingFee: string;
  developmentFee: string;
  autoLiquidityFee: string;
  marketingWallet: string;
  developmentWallet: string;
  autoLiquidityWallet: string;
  maxTxAmount: string;
  maxWalletAmount: string;
  tradingEnabled: boolean;
  tradingStartTime: number;
}

export default function TokenAdminControls() {
  const { address: userAddress } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenContract, setTokenContract] = useState<Contract | null>(null);
  const [adminState, setAdminState] = useState<TokenAdminState>({
    isOwner: false,
    isPaused: false,
    marketingFee: "0",
    developmentFee: "0",
    autoLiquidityFee: "0",
    marketingWallet: "",
    developmentWallet: "",
    autoLiquidityWallet: "",
    maxTxAmount: "0",
    maxWalletAmount: "0",
    tradingEnabled: false,
    tradingStartTime: 0
  });

  const loadTokenAdmin = async () => {
    if (!chainId || !tokenAddress) {
      toast({
        title: "Input Required",
        description: "Please enter a token address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create token contract
      const contract = new Contract(tokenAddress, TOKEN_ADMIN_ABI, signer);
      setTokenContract(contract);

      // Check if user is owner
      const owner = await contract.owner();
      const isOwner = owner.toLowerCase() === userAddress?.toLowerCase();

      if (!isOwner) {
        toast({
          title: "Access Denied",
          description: "You are not the owner of this token",
          variant: "destructive",
        });
        return;
      }

      // Load token admin state
      const [
        isPaused,
        marketingFee,
        developmentFee,
        autoLiquidityFee,
        marketingWallet,
        developmentWallet,
        autoLiquidityWallet,
        maxTxAmount,
        maxWalletAmount,
        tradingEnabled,
        tradingStartTime
      ] = await Promise.all([
        contract.paused(),
        contract.marketingFeePercentage(),
        contract.developmentFeePercentage(),
        contract.autoLiquidityFeePercentage(),
        contract.marketingWallet(),
        contract.developmentWallet(),
        contract.autoLiquidityWallet(),
        contract.maxTxAmount(),
        contract.maxWalletAmount(),
        contract.tradingEnabled(),
        contract.tradingStartTime()
      ]);

      setAdminState({
        isOwner,
        isPaused,
        marketingFee: marketingFee.toString(),
        developmentFee: developmentFee.toString(),
        autoLiquidityFee: autoLiquidityFee.toString(),
        marketingWallet,
        developmentWallet,
        autoLiquidityWallet,
        maxTxAmount: formatEther(maxTxAmount),
        maxWalletAmount: formatEther(maxWalletAmount),
        tradingEnabled,
        tradingStartTime: Number(tradingStartTime)
      });

      toast({
        title: "Success",
        description: "Token admin controls loaded",
      });

    } catch (error) {
      console.error('Error loading token admin:', error);
      toast({
        title: "Error",
        description: "Failed to load token admin controls",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyAction = async (action: 'pause' | 'unpause') => {
    if (!tokenContract) return;

    try {
      setIsLoading(true);
      const tx = await tokenContract[action]();
      await tx.wait();

      setAdminState(prev => ({
        ...prev,
        isPaused: action === 'pause'
      }));

      toast({
        title: "Success",
        description: `Token ${action}d successfully`,
      });
    } catch (error) {
      console.error(`Error ${action}ing token:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} token`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFees = async () => {
    if (!tokenContract) return;

    try {
      setIsLoading(true);
      const tx = await tokenContract.setTaxes(
        adminState.marketingFee,
        adminState.developmentFee,
        adminState.autoLiquidityFee
      );
      await tx.wait();

      toast({
        title: "Success",
        description: "Fees updated successfully",
      });
    } catch (error) {
      console.error('Error updating fees:', error);
      toast({
        title: "Error",
        description: "Failed to update fees",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateWallets = async () => {
    if (!tokenContract) return;

    try {
      setIsLoading(true);
      const tx = await tokenContract.setWallets(
        adminState.marketingWallet,
        adminState.developmentWallet,
        adminState.autoLiquidityWallet
      );
      await tx.wait();

      toast({
        title: "Success",
        description: "Wallets updated successfully",
      });
    } catch (error) {
      console.error('Error updating wallets:', error);
      toast({
        title: "Error",
        description: "Failed to update wallets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTradingLimits = async () => {
    if (!tokenContract) return;

    try {
      setIsLoading(true);
      const [txAmountTx, walletAmountTx] = await Promise.all([
        tokenContract.setMaxTxAmount(parseEther(adminState.maxTxAmount)),
        tokenContract.setMaxWalletAmount(parseEther(adminState.maxWalletAmount))
      ]);
      await Promise.all([txAmountTx.wait(), walletAmountTx.wait()]);

      toast({
        title: "Success",
        description: "Trading limits updated successfully",
      });
    } catch (error) {
      console.error('Error updating trading limits:', error);
      toast({
        title: "Error",
        description: "Failed to update trading limits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableTrading = async () => {
    if (!tokenContract) return;

    try {
      setIsLoading(true);
      const tx = await tokenContract.enableTrading();
      await tx.wait();

      setAdminState(prev => ({
        ...prev,
        tradingEnabled: true
      }));

      toast({
        title: "Success",
        description: "Trading enabled successfully",
      });
    } catch (error) {
      console.error('Error enabling trading:', error);
      toast({
        title: "Error",
        description: "Failed to enable trading",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter token address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="flex-1 bg-gray-900 text-white border-gray-700 px-4 py-2 h-10"
        />
        <Button
          onClick={loadTokenAdmin}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10"
          disabled={isLoading || !tokenAddress}
        >
          {isLoading ? <Spinner /> : 'Load Admin'}
        </Button>
      </div>

      {adminState.isOwner && (
        <Tabs defaultValue="emergency" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
          </TabsList>

          <TabsContent value="emergency">
            <Card>
              <CardHeader>
                <CardTitle>Emergency Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Pause Status</h4>
                    <p className="text-sm text-gray-500">
                      {adminState.isPaused ? 'Token is paused' : 'Token is active'}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleEmergencyAction(adminState.isPaused ? 'unpause' : 'pause')}
                    variant={adminState.isPaused ? "default" : "destructive"}
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner /> : adminState.isPaused ? 'Unpause' : 'Pause'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>Fee Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label>Marketing Fee (%)</Label>
                    <Input
                      type="number"
                      value={adminState.marketingFee}
                      onChange={(e) => setAdminState(prev => ({ ...prev, marketingFee: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                  <div>
                    <Label>Development Fee (%)</Label>
                    <Input
                      type="number"
                      value={adminState.developmentFee}
                      onChange={(e) => setAdminState(prev => ({ ...prev, developmentFee: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                  <div>
                    <Label>Auto-Liquidity Fee (%)</Label>
                    <Input
                      type="number"
                      value={adminState.autoLiquidityFee}
                      onChange={(e) => setAdminState(prev => ({ ...prev, autoLiquidityFee: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdateFees}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : 'Update Fees'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallets">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label>Marketing Wallet</Label>
                    <Input
                      value={adminState.marketingWallet}
                      onChange={(e) => setAdminState(prev => ({ ...prev, marketingWallet: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                  <div>
                    <Label>Development Wallet</Label>
                    <Input
                      value={adminState.developmentWallet}
                      onChange={(e) => setAdminState(prev => ({ ...prev, developmentWallet: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                  <div>
                    <Label>Auto-Liquidity Wallet</Label>
                    <Input
                      value={adminState.autoLiquidityWallet}
                      onChange={(e) => setAdminState(prev => ({ ...prev, autoLiquidityWallet: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdateWallets}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : 'Update Wallets'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trading">
            <Card>
              <CardHeader>
                <CardTitle>Trading Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Trading Status</h4>
                    <p className="text-sm text-gray-500">
                      {adminState.tradingEnabled ? 'Trading is enabled' : 'Trading is disabled'}
                    </p>
                  </div>
                  <Button
                    onClick={handleEnableTrading}
                    disabled={isLoading || adminState.tradingEnabled}
                  >
                    {isLoading ? <Spinner /> : 'Enable Trading'}
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label>Max Transaction Amount</Label>
                    <Input
                      type="number"
                      value={adminState.maxTxAmount}
                      onChange={(e) => setAdminState(prev => ({ ...prev, maxTxAmount: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                  <div>
                    <Label>Max Wallet Amount</Label>
                    <Input
                      type="number"
                      value={adminState.maxWalletAmount}
                      onChange={(e) => setAdminState(prev => ({ ...prev, maxWalletAmount: e.target.value }))}
                      className="bg-gray-900 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdateTradingLimits}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : 'Update Trading Limits'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 