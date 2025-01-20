'use client';

import { CreateTokenForm } from '@/components/token/CreateTokenForm';

export default function CreateTokenPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <CreateTokenForm />
      </div>
    </div>
  );
} 