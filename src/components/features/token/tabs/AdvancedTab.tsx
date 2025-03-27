import { useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from "react";

interface AdvancedTabProps {
  chainId: number;
}

const AdvancedTab = ({ chainId }: AdvancedTabProps) => {
  const form = useFormContext();

  // Set default values when component mounts
  useEffect(() => {
    // Only set if not already set
    if (form.getValues("blacklistEnabled") === undefined) {
      form.setValue("blacklistEnabled", true);
      form.setValue("timeLockEnabled", true);
    }
  }, []);

  return (
    <div className="space-y-2 text-white">
      <div>
        <h3 className="text-lg font-medium">Token Features</h3>
        <p className="text-sm text-gray-400">Configure advanced token options</p>
      </div>
      
      <Card className="p-2 bg-gray-800 border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <FormField
            control={form.control}
            name="blacklistEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-1.5 bg-gray-700">
                <div className="space-y-0.5">
                  <FormLabel className="text-white text-sm">Blacklist Protection</FormLabel>
                  <FormDescription className="text-gray-400 text-xs">
                    Prevent specific addresses from trading or holding tokens
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="timeLockEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-1.5 bg-gray-700">
                <div className="space-y-0.5">
                  <FormLabel className="text-white text-sm">Time Lock</FormLabel>
                  <FormDescription className="text-gray-400 text-xs">
                    Lock tokens for a specified period after purchase
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </Card>
      
      <div>
        <h3 className="text-lg font-medium mb-1">Security & Trust</h3>
        <Alert className="bg-green-900/20 border-green-800/30 text-white">
          <AlertTitle>Built-in Protection</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-1 text-gray-300">
              <li>Reentrancy protection on all critical functions</li>
              <li>Optimized gas efficiency to reduce transaction costs</li>
              <li>Full supply visibility for transparency</li>
              <li>Transfer pause functionality for emergency situations</li>
              <li>Standard ERC20 compliance for maximum compatibility</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
      
      {form.watch("blacklistEnabled") && (
        <Card className="p-2 bg-blue-900/20 border-blue-800/30">
          <h3 className="text-white font-medium mb-1">About Blacklist Protection</h3>
          <p className="text-sm text-gray-300">
            Blacklist protection allows the token owner to restrict specific addresses from transferring tokens.
            This can be useful for:
          </p>
          <ul className="list-disc list-inside mt-1 text-sm text-gray-300">
            <li>Preventing known scammers from trading your token</li>
            <li>Restricting addresses that violate token terms</li>
            <li>Adding security in case of compromised wallets</li>
          </ul>
        </Card>
      )}
      
      {form.watch("timeLockEnabled") && (
        <Card className="p-2 bg-blue-900/20 border-blue-800/30">
          <h3 className="text-white font-medium mb-1">About Time Lock Protection</h3>
          <p className="text-sm text-gray-300">
            Time Lock creates a delay between initiating and executing ownership functions.
            Benefits include:
          </p>
          <ul className="list-disc list-inside mt-1 text-sm text-gray-300">
            <li>Community can observe pending changes before execution</li>
            <li>Prevents immediate malicious actions if owner keys are compromised</li>
            <li>Increases trust by allowing time for community discussion</li>
          </ul>
        </Card>
      )}
    </div>
  );
};

export default AdvancedTab; 