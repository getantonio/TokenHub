import React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { Code } from 'lucide-react';

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
      
      <div className="prose prose-invert max-w-none">
        <MDXRemote source={content} />
      </div>

      {/* Code block styling */}
      <style jsx global>{`
        .prose pre {
          background-color: #1a1b26;
          border: 1px solid #2d2e3b;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1.5rem 0;
          overflow-x: auto;
        }

        .prose pre code {
          background-color: transparent;
          border: none;
          padding: 0;
          font-size: 0.875rem;
          line-height: 1.7;
          color: #c9d1d9;
        }

        .prose code {
          background-color: #2d2e3b;
          border-radius: 0.25rem;
          padding: 0.2em 0.4em;
          font-size: 0.875em;
          color: #c9d1d9;
        }

        .prose a {
          color: #60a5fa;
          text-decoration: none;
        }

        .prose a:hover {
          text-decoration: underline;
        }

        .prose blockquote {
          border-left-color: #3b82f6;
          background-color: #1e293b;
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
        }

        .prose table th {
          background-color: #1e293b;
          border-bottom: 2px solid #3b82f6;
          padding: 0.75rem;
          text-align: left;
        }

        .prose table td {
          padding: 0.75rem;
          border-bottom: 1px solid #2d2e3b;
        }

        .prose table tr:hover {
          background-color: #1a1b26;
        }
      `}</style>
    </div>
  );
} 