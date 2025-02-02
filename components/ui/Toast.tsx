interface ToastProps {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

export function Toast({ type, message, link }: ToastProps) {
  const bgColor = type === 'success' ? 'bg-green-900/20' : 'bg-red-900/20';
  const borderColor = type === 'success' ? 'border-green-500' : 'border-red-500';
  const textColor = type === 'success' ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`p-2 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-1">{type === 'success' ? '🎉' : '⚠️'}</span>
          <div className="ml-1">
            <p className={`text-xs ${textColor}`}>{message}</p>
            {link && (
              <a 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-blue-500 hover:text-blue-400"
              >
                View on Etherscan
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ToastProps };