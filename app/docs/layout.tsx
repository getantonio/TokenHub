'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search } from 'lucide-react';

const sidebarLinks = [
  {
    section: 'Getting Started',
    links: [
      { href: '/docs/getting-started', label: 'Getting Started Guide' },
      { href: '/docs/token-management', label: 'Token Management' },
    ]
  },
  {
    section: 'Token Creation & Management',
    links: [
      { href: '/docs/utility-token-guide', label: 'Utility Token Guide' },
      { href: '/docs/fee-structure', label: 'Fee Structure' },
    ]
  },
  {
    section: 'Launch & Exchange',
    links: [
      { href: '/docs/coin-launch-strategy', label: 'Launch Strategy' },
      { href: '/docs/exchange-listing-guide', label: 'Exchange Listing' },
    ]
  },
  {
    section: 'Legal & Compliance',
    links: [
      { href: '/docs/legal/compliance', label: 'Legal Guidelines' },
    ]
  }
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Documentation header */}
      <div className="sticky top-16 z-30 bg-gray-900 border-b border-gray-800 mb-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h2 className="text-xl font-semibold text-white">Documentation</h2>
            {/* Search bar - can be implemented later */}
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex">
          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-gray-800
            transform transition-transform duration-300 ease-in-out
            lg:translate-x-0 lg:static lg:w-64 lg:mr-8
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto">
              <nav className="p-4">
                {sidebarLinks.map((section, i) => (
                  <div key={i} className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                      {section.section}
                    </h3>
                    <ul className="space-y-1">
                      {section.links.map((link, j) => (
                        <li key={j}>
                          <Link
                            href={link.href}
                            className={`
                              block px-3 py-2 rounded-lg text-sm transition-colors
                              ${pathname === link.href 
                                ? 'bg-blue-600 text-white font-medium' 
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                            `}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="py-6">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
} 