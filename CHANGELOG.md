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