import React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { readFileSync } from 'fs';
import path from 'path';

export default async function TokenManagementPage() {
  // Read both markdown files
  const creationGuide = readFileSync(
    path.join(process.cwd(), 'docs/TOKEN_CREATION_GUIDE.md'),
    'utf-8'
  );
  
  const postDeploymentGuide = readFileSync(
    path.join(process.cwd(), 'docs/POST_DEPLOYMENT_GUIDE.md'),
    'utf-8'
  );

  return (
    <div className="prose prose-invert max-w-none p-6">
      <h1>Token Management Documentation</h1>
      
      <div className="mb-12">
        <h2>Token Creation Guide</h2>
        <div className="markdown-content">
          <MDXRemote source={creationGuide} />
        </div>
      </div>

      <div className="mt-12 pt-12 border-t border-gray-700">
        <h2>Post-Deployment Guide</h2>
        <div className="markdown-content">
          <MDXRemote source={postDeploymentGuide} />
        </div>
      </div>
    </div>
  );
} 