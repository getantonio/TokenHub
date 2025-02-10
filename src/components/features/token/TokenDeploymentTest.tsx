import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { InfoIcon } from '@/components/ui/InfoIcon';

interface TokenDeploymentTestProps {
  name: string;
  symbol: string;
  initialSupply: string | number;
  maxSupply: string | number;
  presaleRate?: string;
  softCap?: string;
  hardCap?: string;
  minContribution?: string;
  maxContribution?: string;
  startTime?: string;
  endTime?: string;
  liquidityLockDuration?: number;
  distributionSegments: Array<{
    name: string;
    percentage: number;
    vestingEnabled?: boolean;
    vestingDuration?: number;
    cliffDuration?: number;
  }>;
}

interface ValidationResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
}

export default function TokenDeploymentTest({
  name,
  symbol,
  initialSupply,
  maxSupply,
  presaleRate,
  softCap,
  hardCap,
  minContribution,
  maxContribution,
  startTime,
  endTime,
  liquidityLockDuration,
  distributionSegments
}: TokenDeploymentTestProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);

  const validateTokenName = (): ValidationResult => {
    const nameLength = name.length;
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(name);
    const commonWords = ['token', 'coin', 'finance', 'defi', 'swap'];
    const containsCommonWord = commonWords.some(word => 
      name.toLowerCase().includes(word)
    );

    if (nameLength < 3 || nameLength > 32) {
      return {
        category: 'Token Name',
        status: 'error',
        message: 'Invalid name length',
        details: ['Name should be between 3 and 32 characters']
      };
    }

    if (hasSpecialChars) {
      return {
        category: 'Token Name',
        status: 'warning',
        message: 'Contains special characters',
        details: ['Consider using only letters, numbers, and spaces']
      };
    }

    if (containsCommonWord) {
      return {
        category: 'Token Name',
        status: 'warning',
        message: 'Contains common token terms',
        details: ['Consider a more unique and memorable name']
      };
    }

    return {
      category: 'Token Name',
      status: 'success',
      message: 'Valid token name',
      details: ['Unique and appropriate length']
    };
  };

  const validateSymbol = (): ValidationResult => {
    const isValid = /^[A-Z]{2,6}$/.test(symbol);
    const isCommon = ['ETH', 'BTC', 'BNB', 'USDT', 'USDC'].includes(symbol);

    if (!isValid) {
      return {
        category: 'Token Symbol',
        status: 'error',
        message: 'Invalid symbol format',
        details: [
          'Should be 2-6 uppercase letters',
          'No numbers or special characters'
        ]
      };
    }

    if (isCommon) {
      return {
        category: 'Token Symbol',
        status: 'error',
        message: 'Reserved symbol',
        details: ['This symbol is already in use by a major token']
      };
    }

    return {
      category: 'Token Symbol',
      status: 'success',
      message: 'Valid symbol',
      details: ['Follows standard format']
    };
  };

  const validateSupply = (): ValidationResult => {
    const initial = Number(initialSupply);
    const max = Number(maxSupply);

    if (initial <= 0 || max <= 0) {
      return {
        category: 'Token Supply',
        status: 'error',
        message: 'Invalid supply values',
        details: ['Supply values must be greater than 0']
      };
    }

    if (initial > max) {
      return {
        category: 'Token Supply',
        status: 'error',
        message: 'Initial supply exceeds max supply',
        details: ['Initial supply should be less than or equal to max supply']
      };
    }

    if (max > 1e12) {
      return {
        category: 'Token Supply',
        status: 'warning',
        message: 'Very large max supply',
        details: [
          'Consider reducing max supply for better tokenomics',
          'Large supplies can be perceived as less valuable'
        ]
      };
    }

    return {
      category: 'Token Supply',
      status: 'success',
      message: 'Valid supply configuration',
      details: ['Supply values are within reasonable ranges']
    };
  };

  const validatePresale = (): ValidationResult => {
    if (!presaleRate || !softCap || !hardCap || !minContribution || !maxContribution) {
      return {
        category: 'Presale Configuration',
        status: 'warning',
        message: 'Missing presale parameters',
        details: ['Some presale parameters are not set']
      };
    }

    const rate = Number(presaleRate);
    const soft = Number(softCap);
    const hard = Number(hardCap);
    const min = Number(minContribution);
    const max = Number(maxContribution);

    if (soft >= hard) {
      return {
        category: 'Presale Configuration',
        status: 'error',
        message: 'Invalid caps',
        details: ['Soft cap must be less than hard cap']
      };
    }

    if (min >= max) {
      return {
        category: 'Presale Configuration',
        status: 'error',
        message: 'Invalid contribution limits',
        details: ['Min contribution must be less than max contribution']
      };
    }

    return {
      category: 'Presale Configuration',
      status: 'success',
      message: 'Valid presale configuration',
      details: [
        'Caps are properly configured',
        'Contribution limits are reasonable'
      ]
    };
  };

  const validateVesting = (): ValidationResult => {
    const vestedSegments = distributionSegments.filter(s => s.vestingEnabled);
    const teamVesting = vestedSegments.find(s => 
      s.name.toLowerCase().includes('team') || 
      s.name.toLowerCase().includes('founder')
    );

    if (vestedSegments.length === 0) {
      return {
        category: 'Vesting',
        status: 'warning',
        message: 'No vesting schedules',
        details: ['Consider adding vesting for team and advisor tokens']
      };
    }

    if (!teamVesting || !teamVesting.vestingEnabled || !teamVesting.vestingDuration || teamVesting.vestingDuration < 180) {
      return {
        category: 'Vesting',
        status: 'warning',
        message: 'Insufficient team vesting',
        details: [
          'Team tokens should be vested for at least 6 months',
          'Consider adding a cliff period'
        ]
      };
    }

    return {
      category: 'Vesting',
      status: 'success',
      message: 'Good vesting configuration',
      details: vestedSegments.map(s => 
        `${s.name}: ${s.vestingDuration}d vesting, ${s.cliffDuration || 0}d cliff`
      )
    };
  };

  const validateDistribution = (): ValidationResult => {
    const totalPercentage = distributionSegments.reduce(
      (sum, segment) => sum + segment.percentage, 
      0
    );

    if (totalPercentage !== 100) {
      return {
        category: 'Token Distribution',
        status: 'error',
        message: 'Invalid total allocation',
        details: [`Total allocation is ${totalPercentage}%, should be 100%`]
      };
    }

    const teamAllocation = distributionSegments.find(s => 
      s.name.toLowerCase().includes('team')
    );
    const liquidityAllocation = distributionSegments.find(s => 
      s.name.toLowerCase().includes('liquidity')
    );

    if (teamAllocation && teamAllocation.percentage > 20) {
      return {
        category: 'Token Distribution',
        status: 'warning',
        message: 'High team allocation',
        details: [
          'Team allocation exceeds recommended maximum of 20%',
          'Consider reducing team allocation for better tokenomics'
        ]
      };
    }

    if (!liquidityAllocation || liquidityAllocation.percentage < 25) {
      return {
        category: 'Token Distribution',
        status: 'warning',
        message: 'Low liquidity allocation',
        details: [
          'Recommend at least 25% for liquidity',
          'Higher liquidity helps reduce price impact'
        ]
      };
    }

    return {
      category: 'Token Distribution',
      status: 'success',
      message: 'Good distribution balance',
      details: distributionSegments.map(s => `${s.name}: ${s.percentage}%`)
    };
  };

  const validateLiquidity = (): ValidationResult => {
    if (!liquidityLockDuration) {
      return {
        category: 'Liquidity Lock',
        status: 'error',
        message: 'No liquidity lock',
        details: ['Liquidity should be locked for security']
      };
    }

    if (liquidityLockDuration < 180) {
      return {
        category: 'Liquidity Lock',
        status: 'warning',
        message: 'Short lock duration',
        details: [
          'Recommend locking liquidity for at least 180 days',
          'Longer locks build more trust'
        ]
      };
    }

    return {
      category: 'Liquidity Lock',
      status: 'success',
      message: 'Good liquidity lock',
      details: [`Liquidity locked for ${liquidityLockDuration} days`]
    };
  };

  const simulateDeployment = async () => {
    setIsSimulating(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const validations = [
      validateTokenName(),
      validateSymbol(),
      validateSupply(),
      validatePresale(),
      validateVesting(),
      validateDistribution(),
      validateLiquidity()
    ];
    
    setResults(validations);
    setIsSimulating(false);
  };

  return (
    <Card className="p-4 bg-gray-900/50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-white">Deployment Analysis</h2>
        <Button
          onClick={simulateDeployment}
          disabled={isSimulating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSimulating ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              Analyzing...
            </>
          ) : (
            'Test Deployment'
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <Alert
              key={index}
              variant={result.status}
              className="flex items-start"
            >
              <div className="flex-1">
                <h4 className="font-medium mb-1 flex items-center gap-2">
                  {result.category}
                  <InfoIcon content={result.message} />
                </h4>
                {result.details && (
                  <ul className="list-disc ml-4 text-sm space-y-1">
                    {result.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Alert>
          ))}

          {results.some(r => r.status === 'error') && (
            <Alert variant="error" className="mt-4">
              <h4 className="font-medium">⚠️ Deployment Not Recommended</h4>
              <p className="text-sm mt-1">
                Please fix the errors above before deploying your token.
              </p>
            </Alert>
          )}

          {!results.some(r => r.status === 'error') && 
           results.some(r => r.status === 'warning') && (
            <Alert variant="warning" className="mt-4">
              <h4 className="font-medium">⚠️ Deployment Possible with Caution</h4>
              <p className="text-sm mt-1">
                Consider addressing the warnings for better token security and adoption.
              </p>
            </Alert>
          )}

          {!results.some(r => r.status === 'error') && 
           !results.some(r => r.status === 'warning') && (
            <Alert variant="success" className="mt-4">
              <h4 className="font-medium">✓ Ready for Deployment</h4>
              <p className="text-sm mt-1">
                All checks passed. Your token configuration follows best practices.
              </p>
            </Alert>
          )}
        </div>
      )}
    </Card>
  );
} 