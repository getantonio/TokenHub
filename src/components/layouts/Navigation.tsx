import { useRouter } from 'next/router';
import Link from 'next/link';
import { cn } from '@utils/cn';
import { useState } from 'react';

const navigation = [
  { name: 'Home', href: '/' },
  {
    name: 'Token Factory',
    items: [
      { name: 'Version 1', href: '/v1' },
      { name: 'Version 2', href: '/v2' },
      { name: 'Version 3', href: '/v3' },
      { name: 'Version 4', href: '#', disabled: true },
    ]
  },
  { name: 'Presale', href: '/presale' },
  { name: 'Admin', href: '/admin' },
  { name: 'Guides', href: '/guides' }
];

export function Navigation() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="bg-background-dark border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-12 space-x-1">
          {navigation.map((item) => (
            item.items ? (
              <div key={item.name} className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1',
                    isDropdownOpen
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  )}
                >
                  {item.name}
                  <svg
                    className={cn("h-4 w-4 transition-transform", isDropdownOpen && "transform rotate-180")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-48 rounded-md bg-background-secondary shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className={cn(
                            'block px-4 py-2 text-sm transition-colors duration-200',
                            subItem.disabled
                              ? 'text-gray-500 cursor-not-allowed'
                              : router.pathname === subItem.href
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                          )}
                          onClick={(e) => {
                            if (subItem.disabled) {
                              e.preventDefault();
                            }
                            setIsDropdownOpen(false);
                          }}
                        >
                          {subItem.name}
                          {subItem.disabled && <span className="ml-2 text-xs">(Coming Soon)</span>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200',
                  router.pathname === item.href
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )}
              >
                {item.name}
              </Link>
            )
          ))}
        </div>
      </div>
    </nav>
  );
} 