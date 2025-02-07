import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TokenDistributionPreviewProps {
  vestingSchedules: {
    walletName: string;
    amount: string;
  }[];
  presalePercent: number;
  liquidityPercent: number;
  platformFeePercent?: number;
}

const COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Green
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#8884d8', // Purple
  '#82ca9d', // Light Green
  '#ffc658', // Light Yellow
  '#ff7300', // Dark Orange
];

export function TokenDistributionPreview({
  vestingSchedules,
  presalePercent,
  liquidityPercent,
  platformFeePercent = 5, // Default to 5%
}: TokenDistributionPreviewProps) {
  // Adjust percentages to account for platform fee
  const adjustedPresalePercent = Math.floor(presalePercent * 0.95); // 95% of original
  const adjustedLiquidityPercent = Math.floor(liquidityPercent * 0.95); // 95% of original
  const adjustedVestingSchedules = vestingSchedules.map(schedule => ({
    name: schedule.walletName,
    value: Math.floor(parseFloat(schedule.amount) * 0.95) // 95% of original
  }));

  // Prepare data for the pie chart
  const data = [
    { name: 'Platform Fee', value: platformFeePercent, color: '#FF0000' }, // Red for platform fee
    { name: 'Presale', value: adjustedPresalePercent },
    { name: 'Liquidity', value: adjustedLiquidityPercent },
    ...adjustedVestingSchedules
  ];

  const totalAllocation = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card p-4">
      <h3 className="text-lg font-medium text-white mb-4">Token Distribution</h3>
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="w-full md:w-1/2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${value}%`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 mt-4 md:mt-0 md:ml-4">
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-300">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total Allocation</span>
                <span className="text-white font-medium">{totalAllocation}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 