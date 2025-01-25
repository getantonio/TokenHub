'use client';

import React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';

interface MarkdownContentProps {
  content: string;
  title?: string;
  lastUpdated?: string;
}

export function MarkdownContent({ content, title, lastUpdated }: MarkdownContentProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {title && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          {lastUpdated && (
            <p className="mt-2 text-sm text-gray-400">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
      
      <div className="prose prose-invert max-w-none
        prose-pre:bg-[#1a1b26] prose-pre:border prose-pre:border-[#2d2e3b] prose-pre:rounded-lg 
        prose-pre:p-4 prose-pre:my-6 prose-pre:overflow-x-auto
        prose-code:bg-[#2d2e3b] prose-code:rounded prose-code:px-2 prose-code:py-0.5 
        prose-code:text-sm prose-code:text-[#c9d1d9]
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-blue-500 prose-blockquote:bg-[#1e293b] 
        prose-blockquote:p-4 prose-blockquote:rounded-lg
        prose-table:w-full prose-table:border-collapse prose-table:my-8
        prose-th:bg-[#1e293b] prose-th:border-b-2 prose-th:border-blue-500 
        prose-th:p-3 prose-th:text-left
        prose-td:p-3 prose-td:border-b prose-td:border-[#2d2e3b]
        hover:prose-tr:bg-[#1a1b26]
      ">
        <MDXRemote source={content} />
      </div>
    </div>
  );
} 