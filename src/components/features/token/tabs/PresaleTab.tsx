import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { getNetworkCurrency } from '@/utils/network';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { InfoIcon } from "@/components/ui/InfoIcon";

interface PresaleTabProps {
  chainId: number;
}

type Stage = 'Seed' | 'Private' | 'Public';
const stages: Stage[] = ['Seed', 'Private', 'Public'];

const PresaleTab = ({ chainId }: PresaleTabProps) => {
  const form = useFormContext();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  const presaleEnabled = form.watch("presaleEnabled");
  const maxActivePresales = form.watch("maxActivePresales");
  const sequentialRounds = form.watch("sequentialRounds") || false;
  const presales = form.watch("multiPresaleConfig.presales") || [];
  
  // Create recommended configs for each presale round
  const [recommendedConfigs, setRecommendedConfigs] = useState<Array<{
    softCap: string;
    hardCap: string;
    rate: string;
    desc: string;
    minContribution: string;
    maxContribution: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }>>([]);

  useEffect(() => {
    // Update recommended configs when base rate changes
    const baseRate = form.watch("presaleRate") || "1000";
    
    const newConfigs = stages.map((stage, index) => {
      const now = new Date();
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      let config = {
        softCap: '10',
        hardCap: '50',
        rate: baseRate,
        desc: `Recommended settings for ${stage} presale round`,
        minContribution: '0.1',
        maxContribution: '5',
        startDate: now.toISOString().split('T')[0],
        startTime: '00:00',
        endDate: oneWeekLater.toISOString().split('T')[0],
        endTime: '23:59'
      };
      
      // Adjust values based on stage
      if (stage === 'Private') {
        config.rate = String(Math.floor(Number(baseRate) * 1.3)); // 30% bonus
        config.hardCap = '10';
        config.maxContribution = '2';
      } else if (stage === 'Public') {
        config.rate = String(Math.floor(Number(baseRate) * 1.15)); // 15% bonus
        config.hardCap = '25';
        config.maxContribution = '3';
      }
      
      return config;
    });
    
    setRecommendedConfigs(newConfigs);
  }, [form.watch("presaleRate")]);

  // Validate dates don't overlap
  const validateDates = (index: number) => {
    const currentRound = presales[index];
    const currentStart = new Date(`${currentRound.startDate}T${currentRound.startTime}`).getTime();
    const currentEnd = new Date(`${currentRound.endDate}T${currentRound.endTime}`).getTime();
    
    // Check overlap with other rounds
    for (let i = 0; i < presales.length; i++) {
      if (i === index) continue;
      
      const otherRound = presales[i];
      const otherStart = new Date(`${otherRound.startDate}T${otherRound.startTime}`).getTime();
      const otherEnd = new Date(`${otherRound.endDate}T${otherRound.endTime}`).getTime();
      
      if (
        (currentStart >= otherStart && currentStart <= otherEnd) ||
        (currentEnd >= otherStart && currentEnd <= otherEnd) ||
        (currentStart <= otherStart && currentEnd >= otherEnd)
      ) {
        return false;
      }
    }
    
    return true;
  };

  const addPresaleRound = () => {
    const now = Math.floor(Date.now() / 1000);
    const tomorrow = now + (24 * 3600);
    const weekLater = tomorrow + (7 * 24 * 3600);
    
    // Get the current stage for this round
    const stage = stages[presales.length] || 'Public';
    
    // Set default values based on the stage
    let defaultRate = "1000";
    let defaultSoftCap = "10";
    let defaultHardCap = "50";
    let defaultMinContribution = "0.1";
    let defaultMaxContribution = "5";
    
    if (stage === 'Private') {
      defaultRate = String(Math.floor(Number(defaultRate) * 1.3)); // 30% bonus
      defaultHardCap = "10";
      defaultMaxContribution = "2";
    } else if (stage === 'Public') {
      defaultRate = String(Math.floor(Number(defaultRate) * 1.15)); // 15% bonus
      defaultHardCap = "25";
      defaultMaxContribution = "3";
    }
    
    const newRound = {
      presaleRate: defaultRate,
      softCap: defaultSoftCap,
      hardCap: defaultHardCap,
      minContribution: defaultMinContribution,
      maxContribution: defaultMaxContribution,
      startDate: new Date(tomorrow * 1000).toISOString().split('T')[0],
      startTime: "12:00",
      endDate: new Date(weekLater * 1000).toISOString().split('T')[0],
      endTime: "12:00",
      whitelistEnabled: stage === 'Seed', // Enable whitelist for seed round by default
      isActive: presales.length === 0 // First round is active by default
    };
    
    const currentPresales = form.getValues("multiPresaleConfig.presales") || [];
    form.setValue("multiPresaleConfig.presales", [...currentPresales, newRound]);
  };
  
  const removePresaleRound = (index: number) => {
    const currentPresales = form.getValues("multiPresaleConfig.presales");
    form.setValue(
      "multiPresaleConfig.presales", 
      currentPresales.filter((_: any, i: number) => i !== index)
    );
  };

  if (!presaleEnabled) {
    return (
      <div className="text-center py-12 text-white">
        <h3 className="text-lg font-medium mb-2">Presale Not Enabled</h3>
        <p className="text-gray-400 mb-4">
          Presale functionality is currently disabled. Enable it to configure presale settings.
        </p>
        <Button 
          variant="secondary"
          onClick={() => {
            form.setValue("presaleEnabled", true);
            form.setValue("presalePercentage", "20"); // Default 20% allocation as string
            form.setValue("sequentialRounds", true); // Enable multiple rounds by default
            addPresaleRound(); // Add first round automatically
          }}
        >
          Enable Presale
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Presale Configuration</h3>
        <InfoIcon 
          content="Soft Cap: Minimum goal for each round. If not met, contributors can reclaim funds. Subsequent rounds still start as scheduled. Hard Cap: Maximum contributions accepted. When reached, the round ends immediately. Later rounds start at their scheduled times. Unsold tokens automatically carry over to later rounds." 
          variant="question"
        />
      </div>
      
      <Card className="p-2 bg-gray-800 border-gray-700">
        <div className="space-y-1.5">
          <FormField
            control={form.control}
            name="presalePercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm">Total Presale Allocation (%)</FormLabel>
                <FormControl>
                  <Input
                    className="h-8"
                    type="number"
                    min="1"
                    max="30"
                    placeholder="5"
                    {...field}
                    onChange={e => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription className="text-gray-400 text-xs">
                  Total percentage of tokens allocated for all presale rounds
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="sequentialRounds"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-1.5 bg-gray-700">
                <div className="space-y-0.5">
                  <FormLabel className="text-white text-sm">Multiple Presale Rounds</FormLabel>
                  <FormDescription className="text-gray-400 text-xs">
                    Enable different rounds (Seed, Private, Public) with different rates
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
      
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {sequentialRounds ? "Presale Rounds" : "Presale Settings"}
        </h3>
        
        {sequentialRounds && (
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={addPresaleRound}
          >
            Add Round
          </Button>
        )}
      </div>
      
      {presales.length === 0 && (
        <div className="text-center p-2 bg-gray-800 rounded-lg">
          <p className="text-gray-400 mb-2">No presale rounds configured.</p>
          <Button
            type="button"
            variant="secondary"
            className="h-8"
            onClick={addPresaleRound}
          >
            Add First Round
          </Button>
        </div>
      )}
      
      {presales.map((_: any, index: number) => (
        <Card key={index} className="p-1.5 bg-gray-800 border-gray-700">
          <div className="flex justify-between items-center mb-1.5">
            <h4 className="font-medium text-sm">
              {sequentialRounds ? `${stages[index]} Round` : 'Presale Settings'}
            </h4>
            {sequentialRounds && (
              <Button
                type="button"
                variant="destructive"
                className="h-8"
                onClick={() => removePresaleRound(index)}
              >
                Remove
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <FormField
              control={form.control}
              name={`multiPresaleConfig.presales.${index}.presaleRate`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1">
                    <FormLabel className="text-white text-sm">Token Rate</FormLabel>
                    <InfoIcon 
                      content="Number of tokens given per 1 ETH contributed. Higher rates mean cheaper tokens."
                      variant="icon"
                    />
                  </div>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="number"
                      min="1"
                      placeholder="1000"
                      {...field}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    Tokens per 1 ETH
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name={`multiPresaleConfig.presales.${index}.softCap`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1">
                    <FormLabel className="text-white text-sm">Soft Cap</FormLabel>
                    <InfoIcon 
                      content="Minimum funding goal. If not met, contributors can claim refunds. Does not prevent next rounds from starting."
                      variant="icon"
                    />
                  </div>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="number"
                      min="0.1"
                      step="0.1"
                      placeholder="1"
                      {...field}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    Minimum ETH to raise
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name={`multiPresaleConfig.presales.${index}.hardCap`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1">
                    <FormLabel className="text-white text-sm">Hard Cap</FormLabel>
                    <InfoIcon 
                      content="Maximum funding amount. When reached, the round ends immediately, regardless of the end time."
                      variant="icon"
                    />
                  </div>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="number"
                      min="0.1"
                      step="0.1"
                      placeholder="5"
                      {...field}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    Maximum ETH to accept
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name={`multiPresaleConfig.presales.${index}.minContribution`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1">
                    <FormLabel className="text-white text-sm">Min Contribution</FormLabel>
                    <InfoIcon 
                      content="Minimum ETH amount required to participate in this presale round."
                      variant="icon"
                    />
                  </div>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.1"
                      {...field}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    Minimum ETH per wallet
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name={`multiPresaleConfig.presales.${index}.maxContribution`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1">
                    <FormLabel className="text-white text-sm">Max Contribution</FormLabel>
                    <InfoIcon 
                      content="Maximum ETH amount any wallet can contribute to this presale round."
                      variant="icon"
                    />
                  </div>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="2"
                      {...field}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    Maximum ETH per wallet
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1">
            <div>
              <h5 className="font-medium text-sm mb-1">Start Time</h5>
              <div className="grid grid-cols-2 gap-1">
                <FormField
                  control={form.control}
                  name={`multiPresaleConfig.presales.${index}.startDate`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Date</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8"
                          type="date"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!validateDates(index)) {
                              form.setError(`multiPresaleConfig.presales.${index}.startDate`, {
                                type: 'manual',
                                message: 'Dates overlap with another round'
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`multiPresaleConfig.presales.${index}.startTime`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Time</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8"
                          type="time"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!validateDates(index)) {
                              form.setError(`multiPresaleConfig.presales.${index}.startTime`, {
                                type: 'manual',
                                message: 'Dates overlap with another round'
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div>
              <h5 className="font-medium text-sm mb-1">End Time</h5>
              <div className="grid grid-cols-2 gap-1">
                <FormField
                  control={form.control}
                  name={`multiPresaleConfig.presales.${index}.endDate`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Date</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8"
                          type="date"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!validateDates(index)) {
                              form.setError(`multiPresaleConfig.presales.${index}.endDate`, {
                                type: 'manual',
                                message: 'Dates overlap with another round'
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`multiPresaleConfig.presales.${index}.endTime`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm">Time</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8"
                          type="time"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!validateDates(index)) {
                              form.setError(`multiPresaleConfig.presales.${index}.endTime`, {
                                type: 'manual',
                                message: 'Dates overlap with another round'
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          
          {sequentialRounds && (
            <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1">
              <FormField
                control={form.control}
                name={`multiPresaleConfig.presales.${index}.whitelistEnabled`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center rounded-lg border border-gray-700 p-1.5 bg-gray-700">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5 ml-3">
                      <FormLabel className="text-white text-sm">Whitelist</FormLabel>
                      <FormDescription className="text-gray-400 text-xs">
                        Limit participation
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name={`multiPresaleConfig.presales.${index}.isActive`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center rounded-lg border border-gray-700 p-1.5 bg-gray-700">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5 ml-3">
                      <FormLabel className="text-white text-sm">Active Round</FormLabel>
                      <FormDescription className="text-gray-400 text-xs">
                        Is this round active?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}
        </Card>
      ))}
      
      <Alert className="bg-blue-900/20 border-blue-800/30">
        <AlertTitle className="text-blue-300">Presale Best Practices</AlertTitle>
        <AlertDescription className="text-gray-300">
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Set soft cap to at least 50% of hard cap</li>
            <li>Consider a 3-7 day duration for most projects</li>
            <li>Ensure max contribution prevents whale concentration</li>
            <li>For multiple rounds, offer better rates in earlier rounds</li>
            <li>Total allocation is shared across all rounds</li>
            <li>Unsold tokens from earlier rounds carry over to later rounds</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PresaleTab; 