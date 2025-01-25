interface ToastProps {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

export function Toast({ type, message, link }: ToastProps) {
  const bgColor = type === 'success' ? 'bg-green-900/20' : 'bg-red-900/20';
  const borderColor = type === 'success' ? 'border-green-700' : 'border-red-700';
  const textColor = type === 'success' ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`rounded-md ${bgColor} p-4 border ${borderColor} mb-4`}>
      <div className="flex">
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${textColor}`}>
            {message}
            {link && (
              <a 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 underline hover:text-opacity-80"
              >
                View on Etherscan →
              </a>
            )}
          </h3>
        </div>
      </div>
    </div>
  );
}

export type { ToastProps }; 