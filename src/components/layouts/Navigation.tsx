import { useRouter } from 'next/router';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { name: 'Presale', href: '/presale' },
  { name: 'Why Choose Us', href: '/why-choose-us' },
  { name: 'Guides', href: '/guides' },
  { name: 'About', href: '/about' },
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
              <div className="absolute top-full left-0 mt-1 w-56 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                <Link href="/defi-loan" className={cn(
                  'block px-4 py-2 text-sm',
                  router.pathname === '/defi-loan'
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}>
                  <div className="flex items-center justify-between">
                    <span>DeFi Loan Factory</span>
                    <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-400 border-green-500/50 whitespace-nowrap">
                      New
                    </Badge>
                  </div>
                </Link>
                <div className="border-t border-gray-700/50 my-1"></div>
                <Link href="/v5" className={cn(
                  'block px-4 py-2 text-sm',
                  router.pathname === '/v5'
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}>
                  <div className="flex items-center justify-between">
                    <span>Token Factory V5</span>
                    <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-400 border-blue-500/50 whitespace-nowrap">
                      Coming Soon
                    </Badge>
                  </div>
                </Link>
                <div className="border-t border-gray-700/50 my-1"></div>
                <Link href="/v4" className={cn(
                  'block px-4 py-2 text-sm',
                  router.pathname === '/v4'
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                )}>
                  Token Factory V4
                </Link>
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