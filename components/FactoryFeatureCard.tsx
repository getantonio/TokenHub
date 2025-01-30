import Link from 'next/link';

interface FactoryFeatureCardProps {
  version: string;
  status: 'STABLE' | 'NEW' | 'PLANNED' | 'FUTURE';
  title: string;
  description: string;
  features: string[];
  details: {
    deploymentFee?: string;
    networks?: string[];
    audited?: boolean;
    upgradeable?: boolean;
  };
  link?: string;
  action: string;
}

export function FactoryFeatureCard({
  version,
  status,
  title,
  description,
  features,
  details,
  link,
  action
}: FactoryFeatureCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'STABLE':
        return 'text-green-500';
      case 'NEW':
        return 'text-green-500';
      case 'PLANNED':
        return 'text-blue-500';
      case 'FUTURE':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-gray-800 p-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow h-full relative">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className={`text-xs font-medium ${getStatusColor(status)} mb-1`}>{status}</div>
          <h2 className="text-base font-bold text-white">{title}</h2>
        </div>
        <div className="text-xs text-gray-400">v{version}</div>
      </div>

      <p className="text-xs text-gray-400 mb-2">{description}</p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <ul className="text-xs text-gray-400 space-y-0.5">
            {features.slice(0, Math.ceil(features.length / 2)).map((feature, index) => (
              <li key={index} className="flex items-center">
                <span className="text-blue-500 mr-1">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <ul className="text-xs text-gray-400 space-y-0.5">
            {features.slice(Math.ceil(features.length / 2)).map((feature, index) => (
              <li key={index} className="flex items-center">
                <span className="text-blue-500 mr-1">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-2 mt-2">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-2">
          {details.deploymentFee && (
            <div>
              <span className="opacity-75">Fee:</span> {details.deploymentFee}
            </div>
          )}
          {details.networks && (
            <div>
              <span className="opacity-75">Networks:</span> {details.networks.join(', ')}
            </div>
          )}
          {(details.audited || details.upgradeable) && (
            <div className="col-span-2 flex space-x-3">
              {details.audited && (
                <span className="text-green-500 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Audited
                </span>
              )}
              {details.upgradeable && (
                <span className="text-blue-500 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Upgradeable
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          {link ? (
            <Link href={link}>
              <button className="w-32 py-1.5 px-3 bg-[#1B4D3E] hover:bg-[#2C614F] text-white rounded text-sm transition-colors duration-200 font-medium">
                {action}
              </button>
            </Link>
          ) : (
            <div className="text-gray-400 text-sm">{action} →</div>
          )}
        </div>
      </div>
    </div>
  );
}