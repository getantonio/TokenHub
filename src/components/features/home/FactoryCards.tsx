import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface FactoryConfig {
  version: string;
  title: string;
  description: string;
  features: string[];
  href: string;
  status?: "new" | "beta" | "stable";
  recommended?: boolean;
}

const factoryConfigs: FactoryConfig[] = [
  {
    version: "v1",
    title: "Token Factory v1",
    description: "Create basic ERC20 tokens with essential features.",
    features: [
      "Standard ERC20",
      "Mintable",
      "Burnable",
      "Pausable",
      "Blacklist",
      "Time Lock"
    ],
    href: "/v1",
    status: "stable"
  },
  {
    version: "v2",
    title: "Token Factory v2",
    description: "Advanced token creation with presale and vesting capabilities.",
    features: [
      "All v1 features",
      "Built-in Presale",
      "Vesting Schedule",
      "Platform Fee",
      "Advanced Security",
      "Upgradeable"
    ],
    href: "/v2",
    status: "stable",
    recommended: true
  },
  {
    version: "v3",
    title: "Token Factory v3",
    description: "Enterprise-grade token platform with advanced features.",
    features: [
      "All v2 features",
      "Multi-token Presale",
      "Advanced Vesting",
      "Governance Ready",
      "Enhanced Security",
      "Premium Support"
    ],
    href: "/v3",
    status: "beta"
  },
  {
    version: "v2_DirectDEX",
    title: "Token Factory v2 DirectDEX",
    description: "Create and instantly list your token on DEX with advanced trading controls.",
    features: [
      "Instant DEX Listing",
      "Multi-DEX Support",
      "Marketing & Dev Fees",
      "Holder Rewards",
      "Anti-Bot Protection",
      "Auto-Liquidity"
    ],
    href: "/v2-direct-dex",
    status: "new",
    recommended: true
  }
];

export default function FactoryCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
      {factoryConfigs.map((config) => (
        <Link key={config.version} href={config.href}>
          <Card className="p-6 hover:border-primary transition-colors cursor-pointer h-full">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{config.title}</h3>
                <p className="text-sm text-gray-500">{config.description}</p>
              </div>
              <div className="flex gap-2">
                {config.status && (
                  <Badge variant={config.status === "stable" ? "default" : "secondary"}>
                    {config.status}
                  </Badge>
                )}
                {config.recommended && (
                  <Badge variant="default">Recommended</Badge>
                )}
              </div>
            </div>
            <ul className="space-y-2">
              {config.features.map((feature) => (
                <li key={feature} className="text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </Link>
      ))}
    </div>
  );
} 