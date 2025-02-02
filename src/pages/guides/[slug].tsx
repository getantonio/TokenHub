import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

interface GuideProps {
  title: string;
  description: string;
  content: string;
  category: string;
}

export default function GuidePage({ title, description, content, category }: GuideProps) {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>{title} - TokenHub.dev</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="text-sm text-gray-400 mb-2">{category}</div>
            <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
            <p className="text-gray-400">{description}</p>
          </div>

          <article className="prose prose-invert prose-headings:text-white prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-strong:text-white prose-code:text-blue-300 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </article>
        </div>
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const docsDirectory = path.join(process.cwd(), 'src/docs');
  const paths: { params: { slug: string } }[] = [];

  function readDirectory(dirPath: string) {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        readDirectory(fullPath);
      } else if (path.extname(item) === '.md') {
        paths.push({
          params: {
            slug: path.basename(item, '.md'),
          },
        });
      }
    });
  }

  readDirectory(docsDirectory);

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<GuideProps> = async ({ params }) => {
  const slug = params?.slug;
  if (typeof slug !== 'string') {
    return {
      notFound: true,
    };
  }

  const docsDirectory = path.join(process.cwd(), 'src/docs');
  let filePath = '';
  let fileContent = '';

  function findFile(dirPath: string): boolean {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (findFile(fullPath)) return true;
      } else if (path.basename(item, '.md') === slug) {
        filePath = fullPath;
        fileContent = fs.readFileSync(fullPath, 'utf8');
        return true;
      }
    }
    
    return false;
  }

  findFile(docsDirectory);

  if (!fileContent) {
    return {
      notFound: true,
    };
  }

  const { data, content } = matter(fileContent);
  const htmlContent = await marked(content, { async: false }) as string;

  return {
    props: {
      title: data.title || 'Untitled Guide',
      description: data.description || '',
      content: htmlContent,
      category: data.category || 'Uncategorized',
    },
  };
}; 