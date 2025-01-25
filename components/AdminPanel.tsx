interface AdminPanelProps {
  account: string;
}

export default function AdminPanel({ account }: AdminPanelProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-text-primary">Admin Panel</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Deployed Tokens</h3>
          <div className="mt-4 border border-border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background-accent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Add deployed tokens here */}
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-text-primary">Upgrade Controls</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <button className="button-secondary">
              Pause All Tokens
            </button>
            <button className="button-primary">
              Upgrade Contracts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 