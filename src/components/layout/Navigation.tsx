import Link from 'next/link';

const tokenFactoryLinks = [
  {
    title: "v1",
    href: "/v1",
    description: "Create basic ERC20 tokens with essential features"
  },
  {
    title: "v2",
    href: "/v2",
    description: "Advanced token creation with presale and vesting"
  },
  {
    title: "v3",
    href: "/v3",
    description: "Enterprise-grade token platform with advanced features"
  },
  {
    title: "v2 DirectDEX",
    href: "/v2-direct-dex",
    description: "Create and instantly list tokens with advanced DEX features"
  },
  {
    title: "DeFi Loan Factory",
    href: "/defi-loan",
    description: "Create customizable lending pools for DeFi assets"
  }
];

export function Navigation() {
  return (
    <nav className="p-4">
      <div className="flex gap-4">
        {tokenFactoryLinks.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="block p-2 hover:bg-gray-100 rounded"
          >
            {link.title}
          </Link>
        ))}
      </div>
    </nav>
  );
} 