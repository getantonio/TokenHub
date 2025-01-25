import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { MarkdownContent } from '@/components/docs/MarkdownContent';
import { Breadcrumbs } from '@/components/docs/Breadcrumbs';

interface PageProps {
  params: {
    slug: string[];
  };
}

// Map slugs to readable names
const slugToTitle: Record<string, string> = {
  'getting-started': 'Getting Started',
  'token-management': 'Token Management',
  'utility-token-guide': 'Utility Token Guide',
  'fee-structure': 'Fee Structure',
  'coin-launch-strategy': 'Launch Strategy',
  'exchange-listing-guide': 'Exchange Listing',
  'legal': 'Legal & Compliance',
  'compliance': 'Compliance Guidelines',
};

export default async function DocPage({ params }: PageProps) {
  try {
    // Convert slug array to path
    const docPath = params.slug.join('/');
    
    // Read the markdown file
    const filePath = path.join(process.cwd(), 'docs', `${docPath}.md`);
    const content = readFileSync(filePath, 'utf-8');
    
    // Get file stats for last updated date
    const stats = require('fs').statSync(filePath);
    const lastUpdated = stats.mtime;

    // Extract title from the first h1 in the markdown
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : docPath.split('/').pop()?.replace(/-/g, ' ');

    // Generate breadcrumb items
    const breadcrumbItems = params.slug.map((slug, index) => {
      const isLast = index === params.slug.length - 1;
      const label = slugToTitle[slug] || slug.replace(/-/g, ' ');
      
      if (isLast) {
        return { label };
      }
      
      const href = '/docs/' + params.slug.slice(0, index + 1).join('/');
      return { label, href };
    });

    return (
      <div className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} />
        <MarkdownContent 
          content={content}
          title={title}
          lastUpdated={lastUpdated.toISOString()}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading documentation:', error);
    notFound();
  }
} 