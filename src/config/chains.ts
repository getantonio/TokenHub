import { Chain } from 'viem';

export const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'AMOY',
    symbol: 'AMOY',
  },
  rpcUrls: {
    default: {
      http: ['https://polygon-amoy.infura.io/v3/de082d8afc854286a7bdc56f2895fc67'],
    },
    public: {
      http: ['https://polygon-amoy.infura.io/v3/de082d8afc854286a7bdc56f2895fc67'],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/amoy',
    },
  },
  testnet: true,
} as const satisfies Chain; 
