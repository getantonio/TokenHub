export interface TokenListing {
  name: string;
  symbol: string;
  description: string;
  price: {
    eth: string;
    usd: string;
    change24h: number;
  };
  marketCap: string;
  supply: {
    total: string;
    forSale: string;
  };
  raised: {
    current: string;
    target: string;
  };
  progress: number;
  status: 'live' | 'upcoming' | 'ended';
  startTime?: string;
  endTime?: string;
  listedDate: string;
  factoryVersion: string;
  trending: boolean;
  isNew: boolean;
}