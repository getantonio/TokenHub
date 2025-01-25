# TokenFactory

A modern dApp for deploying and managing upgradeable ERC20 tokens on the Sepolia network.

## Features

- 🚀 One-click token deployment
- 💼 Multi-wallet token distribution with time locks
- 🔄 Upgradeable smart contracts
- 🎨 Modern dark-themed UI
- 🔒 Advanced token features (mintable, burnable, pausable)
- 💰 Built-in transfer tax options
- ⚡ Sepolia testnet support

## Tech Stack

- Next.js 14
- TypeScript
- Hardhat
- OpenZeppelin
- Ethers.js
- TailwindCSS
- Web3 Wallet Integration

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask wallet
- Sepolia testnet ETH

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TokenFactory.git
cd TokenFactory
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Smart Contract Development

1. Compile contracts:
```bash
npm run compile
```

2. Run tests:
```bash
npm run test
```

3. Deploy to Sepolia:
```bash
npm run deploy:contracts
```

## Project Structure

```
TokenFactory/
├── components/          # React components
├── contracts/          # Solidity smart contracts
├── pages/             # Next.js pages
├── scripts/           # Deployment scripts
├── styles/           # Global styles and Tailwind
├── test/             # Contract test files
├── types/            # TypeScript type definitions
└── hooks/            # Custom React hooks
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

This project is for educational purposes only. Always perform your own security audits before using smart contracts in production.

## Acknowledgments

- OpenZeppelin for smart contract libraries
- Hardhat for the development environment
- The Ethereum community