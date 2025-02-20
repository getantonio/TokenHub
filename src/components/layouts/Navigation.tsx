import { useRouter } from 'next/router';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

const navigation = [
  { name: 'Presale', href: '/presale' },
  { name: 'Guides', href: '/guides' },
  { name: 'Admin', href: '/admin' }
];

export function Navigation() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="relative bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium',
                isDropdownOpen
                  ? 'text-blue-400 bg-gray-800'
                  : 'text-gray-300 hover:text-gray-100'
              )}
            >
              <span>Token Factory</span>
              <svg
                className={cn(
                  'h-4 w-4 transition-transform',
                  isDropdownOpen ? 'rotate-180' : ''
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
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
                  DEX Listing Factory
                </Link>
                <Link href="/uni-to-dex" className={cn(
                  'block px-4 py-2 text-sm',
                  router.pathname === '/uni-to-dex'
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}>
                  Uni To DEX
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

          <div className="flex items-center space-x-4">
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