import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { parseUnits } from 'ethers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/toast/use-toast';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { TOKEN_DECIMALS } from '@/constants';
import { HelpCircle } from 'lucide-react';

const InfoIcon = ({ tooltip }: { tooltip: string }) => (
  <Tooltip content={tooltip}>
    <HelpCircle className="h-4 w-4 ml-1 inline-block text-gray-500" />
  </Tooltip>
);

const beneficiarySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amount: z.string().min(1, 'Amount is required'),
  vestingPeriod: z.string().min(1, 'Vesting period is required')
});

const formSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
  symbol: z.string().min(1, 'Token symbol is required'),
  initialSupply: z.string().min(1, 'Initial supply is required'),
  maxSupply: z.string().min(1, 'Max supply is required'),
  beneficiaries: z.array(beneficiarySchema).min(1, 'At least one beneficiary is required')
});

type FormData = z.infer<typeof formSchema>;

export const TokenForm_V3 = () => {
  const { toast } = useToast();
  const { createToken, isLoading, error } = useTokenFactory('v3');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      beneficiaries: [{ address: '', amount: '', vestingPeriod: '30' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'beneficiaries'
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      const vestingAmounts = data.beneficiaries.map(b => 
        parseUnits(b.amount, TOKEN_DECIMALS)
      );

      const vestingPeriods = data.beneficiaries.map(b => 
        parseInt(b.vestingPeriod) * 24 * 60 * 60 // Convert days to seconds
      );

      const beneficiaryAddresses = data.beneficiaries.map(b => b.address);

      await createToken({
        name: data.name,
        symbol: data.symbol,
        initialSupply: parseUnits(data.initialSupply, TOKEN_DECIMALS),
        maxSupply: parseUnits(data.maxSupply, TOKEN_DECIMALS),
        vestingAmounts,
        vestingPeriods,
        beneficiaries: beneficiaryAddresses
      });

      toast({
        title: 'Success',
        description: 'Token created successfully!'
      });
    } catch (err) {
      console.error('Error creating token:', err);
      toast({
        title: 'Error',
        description: 'Failed to create token. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">
                Token Name
                <InfoIcon tooltip="The full name of your token (e.g., 'My Token')" />
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="My Token"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="symbol">
                Token Symbol
                <InfoIcon tooltip="The symbol of your token (e.g., 'MTK')" />
              </Label>
              <Input
                id="symbol"
                {...form.register('symbol')}
                placeholder="MTK"
              />
              {form.formState.errors.symbol && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.symbol.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="initialSupply">
                Initial Supply
                <InfoIcon tooltip="The initial amount of tokens to mint" />
              </Label>
              <Input
                id="initialSupply"
                type="number"
                {...form.register('initialSupply')}
                placeholder="1000000"
              />
              {form.formState.errors.initialSupply && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.initialSupply.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="maxSupply">
                Maximum Supply
                <InfoIcon tooltip="The maximum amount of tokens that can ever exist" />
              </Label>
              <Input
                id="maxSupply"
                type="number"
                {...form.register('maxSupply')}
                placeholder="2000000"
              />
              {form.formState.errors.maxSupply && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.maxSupply.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>
                Beneficiaries
                <InfoIcon tooltip="Add wallet addresses with their vesting amounts and periods" />
              </Label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ address: '', amount: '', vestingPeriod: '30' })}
              >
                Add Beneficiary
              </Button>
            </div>

            {fields.map((field, index: number) => (
              <Card key={field.id} className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`beneficiaries.${index}.address`}>
                      Wallet Address
                      <InfoIcon tooltip="The Ethereum address to receive tokens" />
                    </Label>
                    <Input
                      {...form.register(`beneficiaries.${index}.address`)}
                      placeholder="0x..."
                    />
                    {form.formState.errors.beneficiaries?.[index]?.address && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.beneficiaries[index]?.address?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`beneficiaries.${index}.amount`}>
                      Amount
                      <InfoIcon tooltip="The amount of tokens to vest" />
                    </Label>
                    <Input
                      type="number"
                      {...form.register(`beneficiaries.${index}.amount`)}
                      placeholder="100000"
                    />
                    {form.formState.errors.beneficiaries?.[index]?.amount && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.beneficiaries[index]?.amount?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`beneficiaries.${index}.vestingPeriod`}>
                      Vesting Period (days)
                      <InfoIcon tooltip="Duration of the vesting period in days" />
                    </Label>
                    <Input
                      type="number"
                      {...form.register(`beneficiaries.${index}.vestingPeriod`)}
                      placeholder="30"
                    />
                    {form.formState.errors.beneficiaries?.[index]?.vestingPeriod && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.beneficiaries[index]?.vestingPeriod?.message}
                      </p>
                    )}
                  </div>
                </div>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(index)}
                    className="mt-2"
                  >
                    Remove
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full mt-6"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Creating Token...' : 'Create Token'}
        </Button>

        {error && (
          <p className="text-red-500 text-sm mt-2">
            {error}
          </p>
        )}
      </Card>
    </form>
  );
}; 