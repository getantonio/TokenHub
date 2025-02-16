// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TokenTemplate_v2DirectDEX.sol";

// Custom errors
error InvalidTokenName(string name);
error InvalidTokenSymbol(string symbol);
error InvalidTokenSupply(uint256 supply);
error InvalidMaxTxAmount(uint256 maxTx, uint256 totalSupply);
error InvalidMaxWalletAmount(uint256 maxWallet, uint256 totalSupply);
error InvalidTradingStartTime(uint256 startTime);
error InvalidFeeConfiguration(uint256 totalFees);
error InvalidWalletAddress(address wallet);

contract TokenFactory_v2_Make is Ownable, ReentrancyGuard {
    string public constant VERSION = "2.0.0";
    
    struct TokenCreationParams {
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 maxTxAmount;
        uint256 maxWalletAmount;
        bool enableTrading;
        uint256 tradingStartTime;
        uint256 marketingFeePercentage;
        address marketingWallet;
        uint256 developmentFeePercentage;
        address developmentWallet;
        uint256 autoLiquidityFeePercentage;
        bool enableBuyFees;
        bool enableSellFees;
    }

    // Validation constants
    uint256 public constant MAX_NAME_LENGTH = 32;
    uint256 public constant MAX_SYMBOL_LENGTH = 8;
    uint256 public constant MIN_TOTAL_SUPPLY = 1000 * 10**18; // 1000 tokens minimum
    uint256 public constant MAX_TOTAL_SUPPLY = 1000000000 * 10**18; // 1B tokens maximum
    uint256 public constant MAX_TOTAL_FEES = 25; // 25% maximum total fees

    // Token tracking
    mapping(address => address) public tokenCreator;
    address[] public allTokens;
    uint256 public creationFee;

    // Events
    event TokenCreated(
        address indexed token,
        address indexed owner,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 creationTime
    );

    constructor(uint256 _creationFee) {
        creationFee = _creationFee;
    }

    function validateTokenParams(TokenCreationParams calldata params) internal view {
        if (bytes(params.name).length == 0 || bytes(params.name).length > MAX_NAME_LENGTH) {
            revert InvalidTokenName(params.name);
        }
        if (bytes(params.symbol).length == 0 || bytes(params.symbol).length > MAX_SYMBOL_LENGTH) {
            revert InvalidTokenSymbol(params.symbol);
        }
        if (params.totalSupply < MIN_TOTAL_SUPPLY || params.totalSupply > MAX_TOTAL_SUPPLY) {
            revert InvalidTokenSupply(params.totalSupply);
        }
        if (params.maxTxAmount == 0 || params.maxTxAmount > params.totalSupply) {
            revert InvalidMaxTxAmount(params.maxTxAmount, params.totalSupply);
        }
        if (params.maxWalletAmount == 0 || params.maxWalletAmount > params.totalSupply) {
            revert InvalidMaxWalletAmount(params.maxWalletAmount, params.totalSupply);
        }
        if (params.tradingStartTime < block.timestamp) {
            revert InvalidTradingStartTime(params.tradingStartTime);
        }
        
        uint256 totalFees = params.marketingFeePercentage + params.developmentFeePercentage + params.autoLiquidityFeePercentage;
        if (totalFees > MAX_TOTAL_FEES) {
            revert InvalidFeeConfiguration(totalFees);
        }
        
        if (params.marketingWallet == address(0) || params.developmentWallet == address(0)) {
            revert InvalidWalletAddress(address(0));
        }
    }

    function createToken(TokenCreationParams calldata params) external payable nonReentrant returns (address) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        // Validate parameters
        validateTokenParams(params);
        
        // Create token with null router (will be set during listing)
        TokenTemplate_v2DirectDEX token = new TokenTemplate_v2DirectDEX(
            params.name,
            params.symbol,
            params.totalSupply,
            params.maxTxAmount,
            params.maxWalletAmount,
            params.enableTrading,
            params.tradingStartTime,
            address(0), // dexRouter - will be set later by Bake contract
            params.marketingFeePercentage,
            params.developmentFeePercentage,
            params.autoLiquidityFeePercentage,
            params.marketingWallet,
            params.developmentWallet,
            address(this), // autoLiquidityWallet - set to factory
            params.enableBuyFees,
            params.enableSellFees
        );
        
        // Store token info
        tokenCreator[address(token)] = msg.sender;
        allTokens.push(address(token));
        
        // Transfer ownership to creator
        token.transferOwnership(msg.sender);
        
        emit TokenCreated(
            address(token),
            msg.sender,
            params.name,
            params.symbol,
            params.totalSupply,
            block.timestamp
        );
        
        return address(token);
    }

    // View functions
    function getCreationFee() external view returns (uint256) {
        return creationFee;
    }

    function isTokenCreator(address token, address user) external view returns (bool) {
        return tokenCreator[token] == user;
    }

    function getTokenCreator(address token) external view returns (address) {
        return tokenCreator[token];
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function getUserCreatedTokens(address user) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allTokens.length; i++) {
            if (tokenCreator[allTokens[i]] == user) {
                count++;
            }
        }
        
        address[] memory userTokens = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allTokens.length; i++) {
            if (tokenCreator[allTokens[i]] == user) {
                userTokens[index] = allTokens[i];
                index++;
            }
        }
        
        return userTokens;
    }

    // Admin functions
    function setCreationFee(uint256 _newFee) external onlyOwner {
        creationFee = _newFee;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 