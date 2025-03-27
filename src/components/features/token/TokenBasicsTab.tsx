import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from "react";

interface TokenBasicsTabProps {
  chainId: number;
  account?: string;
}

const TokenBasicsTab = ({ chainId, account }: TokenBasicsTabProps) => {
  const form = useFormContext();

  // Set default values when component mounts
  useEffect(() => {
    const hasValues = form.getValues("tokenName");
    
    // Only set default values if fields are empty
    if (!hasValues) {
      form.setValue("tokenName", "Test Token");
      form.setValue("tokenSymbol", "TEST");
      form.setValue("initialSupply", "1000000000");
      form.setValue("maxSupply", "1000000000");
      form.setValue("liquidityLockDuration", 365);
    }
  }, []);

  return (
    <div className="space-y-2 text-white">
      <div>
        <h3 className="text-lg font-medium">Token Basics</h3>
        <p className="text-sm text-gray-400">Configure basic token information</p>
      </div>
      
      <Card className="p-2 bg-gray-800 border-gray-700">
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <FormField
              control={form.control}
              name="tokenName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Token Name</FormLabel>
                  <FormControl>
                    <Input className="h-8" placeholder="My Token" {...field} />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    The name of your token (e.g., "Bitcoin", "Ethereum")
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokenSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Token Symbol</FormLabel>
                  <FormControl>
                    <Input className="h-8" placeholder="MTK" {...field} />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    The symbol of your token (e.g., "BTC", "ETH")
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            <FormField
              control={form.control}
              name="initialSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Initial Supply</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="text"
                      placeholder="1000000"
                      value={field.value}
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(e) => {
                        // Ensure only numbers are entered
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    The initial supply of tokens (minimum 1,000,000)
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maxSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Maximum Supply</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="text"
                      placeholder="1000000"
                      value={field.value}
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(e) => {
                        // Ensure only numbers are entered
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    The maximum supply of tokens (minimum 1,000,000)
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="liquidityLockDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm">Liquidity Lock Duration (days)</FormLabel>
                <FormControl>
                  <Input
                    className="h-8"
                    type="number"
                    min="30"
                    placeholder="365"
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription className="text-gray-400 text-xs">
                  How long to lock the liquidity tokens (minimum 30 days)
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
      </Card>
      
      <Alert className="bg-blue-900/20 border-blue-800/30">
        <AlertTitle className="text-blue-300">Token Supply Guidelines</AlertTitle>
        <AlertDescription className="text-gray-300">
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Initial supply should be sufficient for your tokenomics</li>
            <li>Maximum supply can be equal to initial supply for fixed supply tokens</li>
            <li>Consider future token burns or mints when setting max supply</li>
            <li>Higher supply can allow for better price granularity</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default TokenBasicsTab; 