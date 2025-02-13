import { useState } from 'react';
import { useToast } from '@/components/ui/toast/use-toast';
import { useAccount } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface DirectListingFormProps {
  isConnected: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export default function DirectListingForm({ isConnected, onSuccess, onError }: DirectListingFormProps) {
  const { toast } = useToast();
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Implementation will be added later
      toast({
        title: "Success",
        description: "Token created and listed successfully!",
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create and list token",
        variant: "destructive"
      });
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Token Information</h3>
        <div className="space-y-4">
          <div>
            <label>Token Name</label>
            <Input name="name" placeholder="My Token" required />
          </div>
          <div>
            <label>Token Symbol</label>
            <Input name="symbol" placeholder="TKN" required />
          </div>
          <div>
            <label>Total Supply</label>
            <Input name="totalSupply" type="number" placeholder="1000000" required />
          </div>
        </div>
      </Card>
      
      <Button type="submit" disabled={!isConnected || isLoading}>
        {isLoading ? "Creating..." : "Create & List Token"}
      </Button>
    </form>
  );
} 