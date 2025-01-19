import { CreateTokenForm } from '@/components/token/CreateTokenForm';
import Link from 'next/link';

export default function CreateTokenPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 p-4 mb-8">
        <div className="container mx-auto flex justify-between items-center">
          <Link 
            href="/"
            className="text-2xl font-bold text-white hover:text-gray-300"
          >
            TokenHub
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <CreateTokenForm />
      </div>
    </div>
  );
} 