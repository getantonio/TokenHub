import React from 'react';
import fs from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Introduction - Documentation',
};

export default function IntroductionPage() {
  const filePath = path.join(process.cwd(), 'logs', 'docs', 'introduction.md');
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return (
      <article className="prose prose-invert max-w-none">
        <MDXRemote source={content} />
      </article>
    );
  } catch (error) {
    return (
      <div className="prose prose-invert">
        <h1>Document Not Found</h1>
        <p>The requested document could not be found.</p>
      </div>
    );
  }
} 