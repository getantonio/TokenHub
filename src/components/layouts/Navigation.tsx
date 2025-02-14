import { useRouter } from 'next/router';
import Link from 'next/link';
import { cn } from '@utils/cn';
import { useState } from 'react';

const navigation = [
  { name: 'Presale', href: '/presale' },
  { name: 'Guides', href: '/guides' },
  { name: 'Admin', href: '/admin' }
];

export function Navigation() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="bg-background-dark border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-14">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-sm text-gray-400 hover:text-gray-200 flex items-center"
              >
                Token Factory
                <span className="ml-1 opacity-50">{isDropdownOpen ? '▲' : '▼'}</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                  <Link href="/v4" className={cn(
                    'block px-4 py-2 text-sm',
                    router.pathname === '/v4'
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}>
                    Token Factory V4
                    <span className="ml-2 text-xs text-blue-400 opacity-75">Coming Soon</span>
                  </Link>
                  <div className="border-t border-gray-700/50 my-1"></div>
                  <Link href="/v3" className={cn(
                    'block px-4 py-2 text-sm',
                    router.pathname === '/v3'
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}>
                    Token Factory V3
                  </Link>
                  <Link href="/v2" className={cn(
                    'block px-4 py-2 text-sm',
                    router.pathname === '/v2'
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}>
                    Token Factory V2
                  </Link>
                  <Link href="/v2-direct-dex" className={cn(
                    'block px-4 py-2 text-sm',
                    router.pathname === '/v2-direct-dex'
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}>
                    Token Factory V2 DirectDEX
                  </Link>
                  <Link href="/v1" className={cn(
                    'block px-4 py-2 text-sm',
                    router.pathname === '/v1'
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}>
                    Token Factory V1
                  </Link>
                </div>
              )}
            </div>

            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'text-sm',
                  router.pathname === item.href
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
} 