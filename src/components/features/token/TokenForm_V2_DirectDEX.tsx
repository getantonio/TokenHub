import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TokenFormProps {
  isConnected: boolean;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function TokenForm_V2_DirectDEX({ isConnected, onSuccess, onError }: TokenFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    totalSupply: '',
    marketingFee: '',
    developmentFee: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Implement token deployment
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  };

  return (
    <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Token Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Token"
              className="bg-gray-700/50 border-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="symbol">Token Symbol</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="TKN"
              className="bg-gray-700/50 border-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="totalSupply">Total Supply</Label>
            <Input
              id="totalSupply"
              type="number"
              value={formData.totalSupply}
              onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
              placeholder="1000000"
              className="bg-gray-700/50 border-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="marketingFee">Marketing Fee (%)</Label>
            <Input
              id="marketingFee"
              type="number"
              value={formData.marketingFee}
              onChange={(e) => setFormData({ ...formData, marketingFee: e.target.value })}
              placeholder="2"
              className="bg-gray-700/50 border-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="developmentFee">Development Fee (%)</Label>
            <Input
              id="developmentFee"
              type="number"
              value={formData.developmentFee}
              onChange={(e) => setFormData({ ...formData, developmentFee: e.target.value })}
              placeholder="3"
              className="bg-gray-700/50 border-gray-600"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={!isConnected}
        >
          Create Token
        </Button>
      </form>
    </Card>
  );
} 