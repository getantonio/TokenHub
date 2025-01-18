import React from 'react';
import fs from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { Metadata } from 'next';

interface DocPageProps {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  return {
    title: `${params.slug.replace(/-/g, ' ')} - Documentation`,
  }
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { slug } = params;
  const filePath = path.join(process.cwd(), 'logs', 'docs', `${slug}.md`);
  
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    
    return (
      <div className="container mx-auto py-8 prose prose-invert">
        <MDXRemote source={content} />
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold text-red-500">Document Not Found</h1>
        <p className="text-gray-400 mt-2">The requested document could not be found.</p>
      </div>
    );
  }
}

export async function generateStaticParams() {
  const docsPath = path.join(process.cwd(), 'logs', 'docs');
  try {
    const files = await fs.promises.readdir(docsPath);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        slug: file.replace('.md', ''),
      }));
  } catch (error) {
    console.error('Error reading docs directory:', error);
    return [];
  }
} 