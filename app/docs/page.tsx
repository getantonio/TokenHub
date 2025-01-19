import React from 'react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="prose prose-invert max-w-none p-6">
      <h1>Documentation</h1>
      <div className="grid gap-4">
        <Link 
          href="/docs/fee-structure" 
          className="p-4 border rounded-lg hover:bg-gray-800"
        >
          Fee Structure
        </Link>
        <Link 
          href="/docs/getting-started" 
          className="p-4 border rounded-lg hover:bg-gray-800"
        >
          Getting Started
        </Link>
        {/* Add more documentation links as needed */}
      </div>
    </div>
  );
} 