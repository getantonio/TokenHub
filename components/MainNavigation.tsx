import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState } from 'react';

export function MainNavigation() {
  const router = useRouter();
  const [isFactoryOpen, setIsFactoryOpen] = useState(false);

  const factoryItems = [
    { href: '/v1', label: 'V1 Tokens' },
    { href: '/v2', label: 'V2 Tokens' },
  ];

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/presale', label: 'Presales' },
    { href: '/guides', label: 'Guides' },
    { href: '/admin', label: 'Admin' },
  ];

  return (
    <nav className="bg-background-secondary border-b border-border h-10 flex items-center">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {/* Regular nav items */}
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                router.pathname === item.href
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-background-primary'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Token Factory Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFactoryOpen(!isFactoryOpen)}
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap text-gray-300 hover:text-white hover:bg-background-primary flex items-center gap-1"
            >
              Token Factory
              <svg
                className={`w-4 h-4 transition-transform ${isFactoryOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isFactoryOpen && (
              <div className="absolute left-0 mt-1 w-36 rounded-md shadow-lg bg-background-secondary ring-1 ring-border">
                <div className="py-1">
                  {factoryItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        router.pathname === item.href
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-background-primary'
                      }`}
                      onClick={() => setIsFactoryOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 