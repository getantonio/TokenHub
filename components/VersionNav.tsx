import Link from 'next/link';
import { useRouter } from 'next/router';

export function VersionNav() {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <div className="flex justify-center gap-4 mb-6">
      <Link
        href="/v1"
        className={`px-4 py-2 rounded-lg transition-colors ${
          currentPath === '/v1'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Version 1
      </Link>
      <Link
        href="/v2"
        className={`px-4 py-2 rounded-lg transition-colors ${
          currentPath === '/v2'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Version 2
      </Link>
    </div>
  );
}