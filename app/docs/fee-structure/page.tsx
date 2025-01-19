import React from 'react';
import Markdown from 'react-markdown';
import Link from 'next/link';

const content = `
# Token Creation Fee Structure

## Overview
This document outlines the fees associated with creating and deploying tokens using our platform.

## Fee Components
1. Base Creation Fee: 0.1 ETH
2. Gas Fees (Network Dependent)
3. Platform Fee: 2% of team allocation (Mainnet only)

## Network-Specific Costs
- Ethereum Mainnet: ~$300-800
- Arbitrum: ~$25-50
- Optimism: ~$25-45
- Polygon: ~$2
- BNB Chain: ~$4
- Test Networks: Free

## Additional Information
- All fees are paid in the network's native currency
- Gas fees vary based on network congestion
- Platform fee is only applied on mainnet deployments
`;

export default function FeeStructurePage() {
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