import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFactoryOpen, setIsFactoryOpen] = useState(false);
  const router = useRouter();

  const factoryItems = [
    { href: '/v1', label: 'V1 Factory' },
    { href: '/v2', label: 'V2 Factory' },
  ];

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/admin', label: 'Admin' },
    { href: '/presale', label: 'Presale' },
    { href: '/docs', label: 'Documentation' },
  ];

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative flex items-center justify-between h-10">
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1 text-sm rounded-md ${
                  isActive(item.href)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {/* Factory Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFactoryOpen(!isFactoryOpen)}
                className="px-2 py-1 text-sm rounded-md text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-1"
              >
                Factory
                <svg
                  className={`h-4 w-4 transition-transform ${isFactoryOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isFactoryOpen && (
                <div className="absolute left-0 mt-1 w-36 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    {factoryItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2 text-sm ${
                          isActive(item.href)
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
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
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm ${
                isActive(item.href)
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {/* Mobile Factory Links */}
          <div>
            <button
              onClick={() => setIsFactoryOpen(!isFactoryOpen)}
              className="w-full flex justify-between items-center px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Factory
              <svg
                className={`h-4 w-4 transition-transform ${isFactoryOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isFactoryOpen && (
              <div className="pl-4">
                {factoryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm ${
                      isActive(item.href)
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    onClick={() => {
                      setIsOpen(false);
                      setIsFactoryOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 