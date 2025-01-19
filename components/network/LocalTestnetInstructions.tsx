import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Terminal, Copy } from "lucide-react";

interface LocalTestnetInstructionsProps {
  isMobile?: boolean;
  onSwitchToSepolia?: (networkId: number) => Promise<void>;
}

export function LocalTestnetInstructions({ isMobile, onSwitchToSepolia }: LocalTestnetInstructionsProps) {
  const handleSwitchToSepolia = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSwitchToSepolia) {
      onSwitchToSepolia(11155111); // Sepolia chainId
    }
  };

  const getTerminalCommand = () => {
    return 'npm run local-testnet';
  };

  if (isMobile) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Mobile Device Detected
        </AlertTitle>
        <AlertDescription>
          <p className="mb-4">Please use Sepolia Testnet for mobile development.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwitchToSepolia}
            className="w-full"
          >
            Switch to Sepolia Testnet
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="max-w-md">
      <AlertTitle className="flex items-center gap-2 mb-2">
        <Terminal className="h-4 w-4" />
        Local Development Setup
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          {/* Command */}
          <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded">
            <code className="text-sm flex-1">npm run local-testnet</code>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigator.clipboard.writeText('npm run local-testnet')}
              className="h-7 px-2"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick Instructions */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400 text-xs">macOS</span>
              <div className="space-y-1 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs">⌘ Space</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-xs">Terminal</span>
                </div>
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Windows</span>
              <div className="space-y-1 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs">Win+R</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-xs">cmd</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
} 