import React from 'react';
import { Line } from 'react-chartjs-2';
import { TokenConfig } from './types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface VestingVisualizerProps {
  config: TokenConfig;
}

export function VestingScheduleVisualizer({ config }: VestingVisualizerProps) {
  const { teamAllocation, totalSupply, vestingSchedule } = config;
  const { duration, cliff } = vestingSchedule.team;
  
  // Calculate monthly releases
  const monthlyData = Array.from({ length: duration + 1 }, (_, month) => {
    const teamTokens = (parseFloat(totalSupply) * teamAllocation) / 100;
    if (month < cliff) return 0;
    const monthlyRelease = teamTokens / duration;
    return monthlyRelease * (month - cliff + 1);
  });

  const data = {
    labels: Array.from({ length: duration + 1 }, (_, i) => `Month ${i}`),
    datasets: [
      {
        label: 'Tokens Released',
        data: monthlyData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      }
    ]
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-2">Vesting Schedule</h4>
      <div className="p-4 bg-gray-800 rounded-lg">
        <Line 
          data={data}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Tokens Released'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Time'
                }
              }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed.y;
                    return `${value.toLocaleString()} tokens`;
                  }
                }
              }
            }
          }}
        />
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Cliff Period:</span>
            <br />
            {cliff} months
          </div>
          <div>
            <span className="text-gray-400">Total Duration:</span>
            <br />
            {duration} months
          </div>
          <div>
            <span className="text-gray-400">Monthly Release:</span>
            <br />
            {((parseFloat(totalSupply) * teamAllocation) / (100 * duration)).toLocaleString()} tokens
          </div>
        </div>
      </div>
    </div>
  );
} 