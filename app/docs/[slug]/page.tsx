import fs from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { Metadata } from 'next';

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `${params.slug.replace(/-/g, ' ')} - Documentation`,
  }
}

export default function DocPage({ params }: Props) {
  const { slug } = params;
  
  async function getDocContent() {
    try {
      const filePath = path.join(process.cwd(), 'logs', 'docs', `${slug}.md`);
      const content = await fs.promises.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      return null;
    }
  }

  return (
    <div className="container mx-auto py-8 prose prose-invert">
      <React.Suspense fallback={<div>Loading...</div>}>
        {async () => {
          const content = await getDocContent();
          if (!content) {
            return (
              <div>
                <h1 className="text-2xl font-bold text-red-500">Document Not Found</h1>
                <p className="text-gray-400 mt-2">The requested document could not be found.</p>
              </div>
            );
          }
          return <MDXRemote source={content} />;
        }}
      </React.Suspense>
    </div>
  );
}

export async function generateStaticParams() {
  const docsPath = path.join(process.cwd(), 'logs', 'docs');
  const files = await fs.promises.readdir(docsPath);
  
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      slug: file.replace('.md', ''),
    }));
} 