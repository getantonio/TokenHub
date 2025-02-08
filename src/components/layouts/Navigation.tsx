import { useRouter } from 'next/router';
import Link from 'next/link';
import { cn } from '@utils/cn';

const navigation = [
  { name: 'Create Token', href: '/v3' },
  { name: 'Presale', href: '/presale' },
  { name: 'Guides', href: '/guides' },
  { name: 'Admin', href: '/admin' }
];

export function Navigation() {
  const router = useRouter();

  return (
    <nav className="bg-background-dark border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-12 space-x-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200',
                router.pathname === item.href
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
} 