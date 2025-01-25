interface DeploymentPanelProps {
  isConnected: boolean;
}

export default function DeploymentPanel({ isConnected }: DeploymentPanelProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-text-primary">Deployment Status</h2>
      <div className="space-y-4">
        <div className="border-l-4 border-text-accent pl-4">
          <p className="text-sm text-text-secondary">Network</p>
          <p className="font-medium text-text-primary">Sepolia Testnet</p>
        </div>
        <div className="border-l-4 border-green-400 pl-4">
          <p className="text-sm text-text-secondary">Gas Price</p>
          <p className="font-medium text-text-primary">Loading...</p>
        </div>
        <div className="border-l-4 border-yellow-400 pl-4">
          <p className="text-sm text-text-secondary">Recent Deployments</p>
          <ul className="mt-2 space-y-2 text-text-primary">
            {/* Add recent deployments here */}
          </ul>
        </div>
      </div>
    </div>
  );
} 