import React from 'react';
import fs from 'fs';
import path from 'path';
import Markdown from 'react-markdown';

// Define the params type
type Params = {
  slug: string;
};

// Generate static paths for the documentation pages
export async function getStaticPaths() {
  const docsPath = path.join(process.cwd(), 'logs', 'docs');
  const files = fs.readdirSync(docsPath);
  const paths = files
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      params: { slug: file.replace('.md', '') },
    }));

  return { paths, fallback: false };
}

// Generate static props for the documentation pages
export async function getStaticProps({ params }: { params: Params }) {
  const { slug } = params;
  const filePath = path.join(process.cwd(), 'logs', 'docs', `${slug}.md`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      props: {
        content,
      },
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
}

// Page component to render the documentation
export default function DocPage({ content }: { content: string }) {
  return (
    <article className="prose prose-invert max-w-none">
      <Markdown>{content}</Markdown>
    </article>
  );
} 