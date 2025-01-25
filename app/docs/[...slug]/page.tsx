import { readFileSync } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

export default function DocPage({ params }: any) {
  try {
    const docPath = params.slug.join('/');
    
    // Try HTML file first
    try {
      const htmlPath = path.join(process.cwd(), 'docs', `${docPath}.html`);
      const content = readFileSync(htmlPath, 'utf-8');
      return (
        <div 
          className="max-w-4xl mx-auto p-8" 
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      );
    } catch {
      // If HTML file not found, try markdown file
      const mdPath = path.join(process.cwd(), 'docs', `${docPath}.md`);
      const content = readFileSync(mdPath, 'utf-8');
      return (
        <div className="max-w-4xl mx-auto p-8">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      );
    }
  } catch (error) {
    console.error('Error loading doc:', error);
    notFound();
  }
} 