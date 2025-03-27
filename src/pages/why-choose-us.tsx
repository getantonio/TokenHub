import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const features = [
  {
    category: "Vesting Implementation",
    ourScore: 95,
    competitorScore: 80,
    details: [
      "Cliff periods",
      "Linear vesting schedules",
      "Multiple wallet allocations",
      "Customizable durations",
      "Start time controls"
    ]
  },
  {
    category: "Liquidity Protection",
    ourScore: 90,
    competitorScore: 85,
    details: [
      "LP token locking",
      "Configurable lock durations",
      "Removal restrictions",
      "Safety checks",
      "Protection mechanisms"
    ]
  },
  {
    category: "Security Features",
    ourScore: 100,
    competitorScore: 85,
    details: [
      "ReentrancyGuard",
      "Ownership controls",
      "Blacklist functionality",
      "Time-lock mechanisms",
      "Pausable functionality",
      "Contract-based vesting (no external dependencies)",
      "On-chain distribution (immutable & transparent)",
      "Multi-signature wallet support",
      "Emergency pause functionality",
      "Automated security checks"
    ]
  },
  {
    category: "Distribution Flexibility",
    ourScore: 95,
    competitorScore: 75,
    details: [
      "Multiple preset strategies",
      "Custom wallet allocations",
      "Vested/non-vested options",
      "Percentage-based allocations",
      "Labeled allocations"
    ]
  },
  {
    category: "AI-Assisted Launch",
    ourScore: 100,
    competitorScore: 0,
    details: [
      "Smart presale optimization",
      "Market analysis tools",
      "Trading strategy recommendations",
      "Risk assessment metrics",
      "Automated post-launch monitoring",
      "AI-powered documentation generation",
      "Tokenomics builder with AI assistance",
      "Audit preparation workshop"
    ]
  }
];

const advantages = [
  {
    title: "Direct Contract Integration",
    description: "No external dependencies or service layers required",
    icon: "🔒"
  },
  {
    title: "Lower Cost",
    description: "No service fees or hidden costs",
    icon: "💰"
  },
  {
    title: "Full Control",
    description: "Direct contract interaction and management",
    icon: "🎮"
  },
  {
    title: "Transparency",
    description: "Open source code with full auditability",
    icon: "🔍"
  },
  {
    title: "Multiple Security Layers",
    description: "Built-in protection mechanisms",
    icon: "🛡️"
  },
  {
    title: "Modular Architecture",
    description: "Clear separation of concerns",
    icon: "🏗️"
  },
  {
    title: "AI-Powered Insights",
    description: "Smart analytics and recommendations",
    icon: "🤖"
  },
  {
    title: "Launchpad Workshop",
    description: "Comprehensive launch strategy guidance",
    icon: "🚀"
  }
];

export default function WhyChooseUs() {
  const [chartData, setChartData] = useState({
    labels: features.map(f => f.category),
    datasets: [
      {
        label: 'Our Platform',
        data: features.map(f => f.ourScore),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Competitor',
        data: features.map(f => f.competitorScore),
        backgroundColor: 'rgba(107, 114, 128, 0.8)',
        borderColor: 'rgb(107, 114, 128)',
        borderWidth: 1,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Feature Comparison',
        color: 'white',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Why Choose Us - TokenHub.dev</title>
        <meta name="description" content="Compare our token factory with commercial solutions" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-white mb-4">Why Choose TokenHub.dev?</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover why our token factory stands out from commercial solutions with superior security, flexibility, and cost-effectiveness.
            </p>
          </div>

          {/* Comparison Chart */}
          <div className="bg-gray-800 rounded-lg p-6 mb-16">
            <div className="max-w-4xl mx-auto h-[400px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Feature Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">{feature.category}</h3>
                <div className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center text-gray-300">
                      <span className="text-blue-500 mr-2">✓</span>
                      {detail}
                    </div>
                  ))}
                </div>
                {feature.category === "Security Features" && (
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <p className="text-sm text-blue-300">
                      Unlike solutions that rely on external services for vesting and distribution, our platform handles everything on-chain through smart contracts. This eliminates third-party risks, ensures immutability, and provides complete transparency of all operations.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Workshop Section */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-8 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">AI-Assisted Launchpad Workshop</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Our unique AI-powered workshop helps you optimize your token launch and post-launch trading strategy
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Presale Optimization</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Smart pricing recommendations based on market analysis
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Optimal allocation strategies for different investor tiers
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Risk assessment and mitigation planning
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Automated market sentiment analysis
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Post-Launch Trading</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Real-time market monitoring and alerts
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Trading strategy recommendations
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Liquidity management optimization
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Performance analytics and reporting
                  </li>
                </ul>
              </div>
            </div>

            {/* Additional AI Tools Section */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="text-3xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-white mb-4">Documentation Generator</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Professional project documentation
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Technical specifications
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    API documentation
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    User guides and tutorials
                  </li>
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-4">Tokenomics Builder</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Token distribution modeling
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Vesting schedule optimization
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Economic model analysis
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Market impact projections
                  </li>
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="text-3xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-white mb-4">Audit Preparation</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Vulnerability assessment
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Code optimization suggestions
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Best practices compliance
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">•</span>
                    Audit report preparation
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Our Advantages */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-6">Our Key Advantages</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advantages.map((advantage, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 transform hover:scale-105 transition-transform">
                <div className="text-4xl mb-4">{advantage.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{advantage.title}</h3>
                <p className="text-gray-300">{advantage.description}</p>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Create your secure, customizable token with our advanced factory today.
            </p>
            <a
              href="/v3"
              className="inline-block px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Launch Token Factory
            </a>
          </div>
        </div>
      </main>
    </div>
  );
} 