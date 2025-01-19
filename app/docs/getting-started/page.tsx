import React from 'react';
import Markdown from 'react-markdown';
import Link from 'next/link';

const content = `
# Getting Started

## Overview
Learn how to create and deploy your token using our platform.

## Prerequisites
1. Web3 wallet (MetaMask recommended)
2. Network native currency for gas fees
3. Token configuration details ready

## Steps
1. Connect your wallet
2. Configure your token
3. Review settings
4. Deploy token

## Additional Resources
- View our fee structure
- Join our community
- Get support
`;

export default function GettingStartedPage() {
  return (
    <div className="prose prose-invert max-w-none p-6">
      <Link href="/docs" className="text-blue-400 hover:underline mb-4 block">
        ← Back to Documentation
      </Link>
      <article>
        <Markdown>{content}</Markdown>
      </article>
    </div>
  );
} 