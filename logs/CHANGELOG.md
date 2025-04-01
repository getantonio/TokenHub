# Changelog
All notable changes to the TokenFactory project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-25

### Added
- Initial implementation of upgradeable ERC20 token (BaseV1)
- Basic token features:
  - Name, symbol, decimals (18)
  - Initial supply configuration
  - Maximum supply limit
  - Minting capability (owner only)
- Security features:
  - UUPS upgrade pattern
  - Owner controls (OwnableUpgradeable)
  - Address blacklisting
  - Time-lock mechanism for token transfers
- Comprehensive test suite covering all features
- Gas-optimized implementation:
  - Deployment: ~1.36M gas
  - Transfer: ~61.7K gas
  - Blacklist: ~51.3K gas
  - Mint: ~65.3K gas

### Security
- Implemented OpenZeppelin's secure contracts
- Added transfer restrictions via blacklist
- Added time-lock mechanism for token releases
- Owner-only access control for critical functions

### Technical Details
- Solidity version: 0.8.22
- OpenZeppelin upgradeable contracts
- Hardhat development environment
- TypeScript/JavaScript testing framework
- Ethers.js for blockchain interactions

### Dependencies
- @openzeppelin/contracts-upgradeable
- @nomicfoundation/hardhat-toolbox
- @openzeppelin/hardhat-upgrades

## [1.1.0] - 2024-01-26

### Added
- Frontend implementation with Next.js and TypeScript
- TokenForm component for deploying new tokens:
  - Form fields for all token parameters
  - Web3 integration with ethers v6
  - Network-aware contract configuration
  - Wallet connection handling
- Smart contract configuration system:
  - Network-specific contract addresses
  - TypeScript interfaces for type safety
  - Support for multiple networks (Mainnet, Goerli, Sepolia)

### Technical Details
- Next.js frontend framework
- Ethers.js v6 for Web3 interactions
- TailwindCSS for styling
- TypeScript for type safety

## [1.1.1] - 2024-01-26

### Changed
- Implemented versioned component architecture:
  - Renamed TokenForm to TokenForm_v1 to match contract versioning
  - Components now track their contract version for easier upgrades
- Applied dark theme styling:
  - Custom color scheme for better visibility
  - Consistent styling across components
  - Improved form and admin panel UI
- Enhanced form validation:
  - Real-time error checking
  - Visual feedback for input states
  - Supply validation logic

### Added
- TokenAdmin component for managing deployed tokens:
  - List view of all deployed tokens
  - Blacklist management interface
  - Preparation for time lock features

## [1.2.0] - 2024-01-26

### Added
- Multi-network support:
  - Sepolia Testnet
  - Polygon Amoy Testnet
  - Optimism Sepolia Testnet
  - Arbitrum Sepolia Testnet
- Network configuration system:
  - Network-specific contract addresses
  - Explorer URL configuration
  - Network status indicators
- New landing page with version roadmap:
  - V1: Current version (Basic ERC20)
  - V2: Presale functionality (Coming Soon)
  - V3: Liquidity features (Planned)
  - V4: Advanced features (Future)
- Improved navigation:
  - Version-specific routes (/v1, /v2)
  - Back navigation
  - Clear version indicators

### Changed
- Restructured application architecture:
  - Separated v1 implementation into its own route
  - Created placeholder for v2 features
  - Enhanced success messages with explorer links
  - Updated network switching UI
- Improved explorer integration:
  - Network-aware explorer links
  - Support for different explorer formats (Etherscan, OKLink)
  - Enhanced token viewing experience

## [Unreleased]

### Added
- Test suite for TokenTemplate_v1.1.0 with comprehensive test coverage
- Test suite for TokenFactory_v1.1.0 with deployment, token creation, and ownership tests
- Test suite for TokenTemplate_v2.1.0 with presale functionality tests
- Test suite for TokenFactory_v2.1.0 with enhanced token creation tests
- Helper functions in test/helpers/setup.ts for common test operations
- TypeScript interfaces for contract types:
  - TokenContract for base token functionality
  - PresaleTokenContract for presale features
  - TestContext and PresaleTestContext for test organization

### Changed
- Updated test structure to use TypeScript with proper type definitions
- Improved test organization with separate test files for each contract version
- Enhanced type safety in test files with proper interfaces
- Refactored test setup for better code reuse

### Security
- Added tests to verify ownership transfer mechanisms
- Implemented two-step ownership transfer process for safer ownership changes
- Added tests to ensure only owner can create tokens in factory
- Added comprehensive presale security tests:
  - Contribution limits
  - Presale lifecycle management
  - Owner-only controls 