interface NetworkCost {
  network: string;
  token: string;
  vesting: string;
  total: string;
}

const NETWORK_COSTS: NetworkCost[] = [
  {
    network: "Ethereum",
    token: "$200-500",
    vesting: "$150-300",
    total: "$300-800"
  },
  {
    network: "Arbitrum",
    token: "$15-30",
    vesting: "$10-20",
    total: "$25-50"
  },
  {
    network: "Optimism",
    token: "$15-25",
    vesting: "$10-20",
    total: "$25-45"
  },
  {
    network: "Polygon",
    token: "$0.50-1",
    vesting: "$0.30-0.80",
    total: "$~2"
  },
  {
    network: "BNB Chain",
    token: "$1-2",
    vesting: "$0.80-1.50",
    total: "$~4"
  },
  {
    network: "Sepolia (Testnet)",
    token: "$0",
    vesting: "$0",
    total: "$0"
  }
];

export function NetworkCosts() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Network Deployment Costs</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 text-sm font-medium text-gray-400">Network</th>
              <th className="text-right py-2 text-sm font-medium text-gray-400">Token</th>
              <th className="text-right py-2 text-sm font-medium text-gray-400">Vesting</th>
              <th className="text-right py-2 text-sm font-medium text-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {NETWORK_COSTS.map((cost, index) => (
              <tr 
                key={cost.network}
                className={`${
                  index !== NETWORK_COSTS.length - 1 ? 'border-b border-gray-700/50' : ''
                }`}
              >
                <td className="py-2 text-sm text-white">{cost.network}</td>
                <td className="text-right py-2 text-sm text-gray-300">{cost.token}</td>
                <td className="text-right py-2 text-sm text-gray-300">{cost.vesting}</td>
                <td className="text-right py-2 text-sm text-gray-300">{cost.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-4 italic">
        * Costs are estimates and may vary based on network conditions
      </p>
    </div>
  );
}