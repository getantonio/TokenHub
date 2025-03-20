import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast/use-toast';

export default function AddLiquidityDialog() {
  const { toast } = useToast();
  const [useContractTokens, setUseContractTokens] = useState(true);

  return (
    <>
      {useContractTokens && (
        <Alert variant="warning" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <h4 className="font-medium">Contract Tokens Usage Note</h4>
          <p className="text-sm">
            Some token contracts may not allow direct use of contract tokens for liquidity.
            If you encounter errors, try using tokens from your wallet instead.
          </p>
        </Alert>
      )}

      {/* Add diagnostic help button */}
      <div className="mt-4 border-t pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          Having trouble adding liquidity? Try our diagnostic tool:
        </p>
        <Button 
          variant="secondary" 
          className="w-full text-sm py-1"
          onClick={() => {
            // Show helpful information and instructions
            toast({
              title: "Liquidity Addition Tips",
              description: "1. Use wallet tokens instead of contract tokens. 2. Try a smaller amount (e.g. 1000 tokens). 3. For first liquidity, high slippage (50%+) is normal."
            });
            
            // Offer guidance on token compatibility
            toast({
              title: "Token Compatibility",
              description: "Tokens with special mechanics (reflections, fees, rebasing) may not work with standard DEXs. Specialized DEXs may be required."
            });
          }}
        >
          Show Liquidity Help
        </Button>
      </div>
    </>
  );
} 