import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface Guide {
  title: string;
  href: string;
  description: string;
  category: string;
}

interface GuideSection {
  category: string;
  guides: Guide[];
}

function getGuides(): GuideSection[] {
  const docsDirectory = path.join(process.cwd(), 'src/docs');
  const sections: { [key: string]: Guide[] } = {
    'Token Creation': [],
    'Launch Strategy': [],
    'Token Economics': [],
    'Security & Compliance': [],
  };

  // Helper function to read markdown files
  function readMarkdownFile(filePath: string): Guide | null {
    try {
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContents);
      
      if (data.title && data.description && data.category) {
        return {
          title: data.title,
          description: data.description,
          href: `/guides/${path.basename(filePath, '.md')}`,
          category: data.category,
        };
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
    return null;
  }

  // Read all markdown files in the docs directory
  function readDirectory(dirPath: string) {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        readDirectory(fullPath);
      } else if (path.extname(item) === '.md') {
        const guide = readMarkdownFile(fullPath);
        if (guide && sections[guide.category]) {
          sections[guide.category].push(guide);
        }
      }
    });
  }

  readDirectory(docsDirectory);

  return Object.entries(sections).map(([category, guides]) => ({
    category,
    guides: guides.sort((a, b) => a.title.localeCompare(b.title)),
  }));
}

export async function getStaticProps() {
  const guides = getGuides();
  return {
    props: {
      guides,
    },
  };
}

interface GuidesPageProps {
  guides: GuideSection[];
}

export default function GuidesPage({ guides }: GuidesPageProps) {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - Guides</title>
        <meta name="description" content="Learn how to create and manage your token with our comprehensive guides" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Guides</h1>
          <p className="text-gray-400 mb-8">Learn how to create and manage your token with our comprehensive guides.</p>

          <div className="space-y-8">
            {guides.map((section) => (
              <div key={section.category} className="space-y-4">
                <h2 className="text-2xl font-bold text-white">{section.category}</h2>
                <div className="grid gap-4">
                  {section.guides.map((guide) => (
                    <Link
                      key={guide.href}
                      href={guide.href}
                      className="block p-6 bg-background-secondary rounded-lg border border-border hover:border-text-accent transition-colors"
                    >
                      <h3 className="text-xl font-bold text-white mb-2">{guide.title}</h3>
                      <p className="text-gray-400">{guide.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 