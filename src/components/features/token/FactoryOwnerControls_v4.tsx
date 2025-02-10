import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FactoryOwnerControls_v4Props {
  isOwner: boolean;
  onAction?: (action: string, params: any) => void;
}

export function FactoryOwnerControls_v4({ isOwner, onAction }: FactoryOwnerControls_v4Props) {
  const [feeRecipient, setFeeRecipient] = useState('');
  const [deploymentFee, setDeploymentFee] = useState('');
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [pauseState, setPauseState] = useState(false);

  const handleAction = async (action: string, params: any) => {
    if (!isOwner) return;
    try {
      onAction?.(action, params);
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  if (!isOwner) {
    return (
      <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
        <div className="text-center text-gray-400">
          Only factory owner can access these controls
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Factory Owner Controls</h2>
          <p className="text-sm text-gray-400">Manage V4 factory settings and permissions</p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
          Admin
        </Badge>
      </div>

      <Tabs defaultValue="fees" className="space-y-6">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-200">Fee Recipient</Label>
              <div className="flex gap-2">
                <Input
                  value={feeRecipient}
                  onChange={(e) => setFeeRecipient(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
                <Button
                  onClick={() => handleAction('setFeeRecipient', { address: feeRecipient })}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Update
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-200">Deployment Fee (ETH)</Label>
              <div className="flex gap-2">
                <Input
                  value={deploymentFee}
                  onChange={(e) => setDeploymentFee(e.target.value)}
                  type="number"
                  step="0.01"
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
                <Button
                  onClick={() => handleAction('setDeploymentFee', { fee: deploymentFee })}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="whitelist" className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-200">Address</Label>
            <div className="flex gap-2">
              <Input
                value={whitelistAddress}
                onChange={(e) => setWhitelistAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              />
              <Button
                onClick={() => handleAction('addToWhitelist', { address: whitelistAddress })}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add
              </Button>
              <Button
                onClick={() => handleAction('removeFromWhitelist', { address: whitelistAddress })}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Remove
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-white">Factory Status</h3>
                <p className="text-xs text-gray-400">Current state: {pauseState ? 'Paused' : 'Active'}</p>
              </div>
              <Button
                onClick={() => {
                  const newState = !pauseState;
                  setPauseState(newState);
                  handleAction('setPause', { paused: newState });
                }}
                className={pauseState ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {pauseState ? 'Unpause' : 'Pause'}
              </Button>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <Button
                onClick={() => handleAction('emergencyWithdraw', {})}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Emergency Withdraw
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upgrades" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-200">New Implementation Address</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="0x..."
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
                <Button
                  onClick={() => handleAction('upgrade', { address: whitelistAddress })}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Upgrade
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <Button
                onClick={() => handleAction('verifyUpgrade', {})}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Verify Current Implementation
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
} 