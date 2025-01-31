import { Header } from '../components/Header';
import Head from 'next/head';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Admin Panel</title>
        <meta name="description" content="TokenHub.dev admin panel for factory management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <h1 className="text-xl font-bold text-white mb-4">⚙️ Admin Panel Under Maintenance</h1>
            <p className="text-gray-400 mb-2">
              The admin panel is currently being updated to improve functionality and fix issues.
            </p>
            <p className="text-gray-400">
              Please use the token management sections in the V1 and V2 pages for now.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 