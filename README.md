# Token Factory

A comprehensive platform for creating and managing tokens across multiple networks.

## Overview

Token Factory is a decentralized platform that allows users to create and manage various types of tokens across multiple networks. The platform is being developed in multiple versions, each adding new features and capabilities.

## Versions

### Token Factory v1 (Current)
- Basic ERC20 token creation
- Security features:
  - Blacklist capability
  - Time lock mechanism
- Multi-network support
- Token management interface

### Token Factory v2 (Coming Soon)
- Simple presale functionality
- Whitelist support
- Timed presale rounds
- Soft/Hard caps
- Presale management interface

### Token Factory v3 (Planned)
- Auto liquidity pool creation
- Initial price setting
- Liquidity locking mechanism
- Trading limits and restrictions

### Token Factory v4 (Future)
- Auto contract verification
- Marketing features
- Governance options
- Cross-chain support

## Supported Networks

- Sepolia Testnet (Ethereum)
- Arbitrum Sepolia
- Optimism Sepolia
- Polygon Amoy

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/token-factory.git
cd token-factory
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Development

### Project Structure
```
token-factory/
├── contracts/           # Smart contracts
├── components/          # React components
├── pages/              # Next.js pages
├── config/             # Configuration files
├── scripts/            # Deployment scripts
├── test/              # Test files
└── types/             # TypeScript types
```

### Key Technologies
- Solidity
- TypeScript
- Next.js
- Hardhat
- Ethers.js
- OpenZeppelin

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

This project is for educational purposes only. Always perform your own security audits before using smart contracts in production.

## Acknowledgments

- OpenZeppelin for smart contract libraries
- Hardhat for the development environment
- The Ethereum community