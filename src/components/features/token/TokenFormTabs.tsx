import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormProvider, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";

// Tab content components
import TokenBasicsTab from './tabs/TokenBasicsTab';
import PresaleTab from './tabs/PresaleTab';
import DistributionTab from './tabs/DistributionTab';
import AdvancedTab from './tabs/AdvancedTab';

export interface TokenFormTabsProps {
  form: UseFormReturn<any>;
  isConnected: boolean;
  chainId: number;
  account: string | undefined;
  loading: boolean;
  onSimulate: () => void;
  onSubmit: (data: any) => void;
}

const TokenFormTabs = ({ 
  form, 
  isConnected, 
  chainId,
  account,
  loading,
  onSimulate,
  onSubmit
}: TokenFormTabsProps) => {
  const [activeTab, setActiveTab] = useState("basics");

  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <Tabs defaultValue="basics" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basics">Token Basics</TabsTrigger>
            <TabsTrigger value="presale">Presale</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basics" className="space-y-4 mt-4 bg-transparent">
            <TokenBasicsTab chainId={chainId} account={account} />
          </TabsContent>
          
          <TabsContent value="presale" className="space-y-4 mt-4 bg-transparent">
            <PresaleTab chainId={chainId} />
          </TabsContent>
          
          <TabsContent value="distribution" className="space-y-4 mt-4 bg-transparent">
            <DistributionTab chainId={chainId} account={account} />
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 mt-4 bg-transparent">
            <AdvancedTab chainId={chainId} />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <div className="space-x-2">
            {activeTab !== "basics" && (
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => {
                  const tabOrder = ["basics", "presale", "distribution", "advanced"];
                  const currentIndex = tabOrder.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabOrder[currentIndex - 1]);
                  }
                }}
              >
                Previous
              </Button>
            )}
            
            {activeTab !== "advanced" && (
              <Button 
                type="button" 
                variant="default"
                onClick={() => {
                  const tabOrder = ["basics", "presale", "distribution", "advanced"];
                  const currentIndex = tabOrder.indexOf(activeTab);
                  if (currentIndex < tabOrder.length - 1) {
                    setActiveTab(tabOrder[currentIndex + 1]);
                  }
                }}
              >
                Next
              </Button>
            )}
          </div>
          
          <div className="space-x-2">
            <Button 
              type="button" 
              variant="secondary"
              onClick={onSimulate}
            >
              Simulate
            </Button>
            
            <Button 
              type="submit" 
              disabled={!isConnected || loading || !form.formState.isValid}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  Deploying...
                </>
              ) : (
                "Deploy Token"
              )}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default TokenFormTabs; 