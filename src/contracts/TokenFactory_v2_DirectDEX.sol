// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "./TokenTemplate_v2.sol";

contract TokenFactory_v2_DirectDEX is Ownable, ReentrancyGuard {
    string public constant VERSION = "2.0.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));

    struct DEXRouter {
        string name;        // e.g., "PancakeSwap", "Uniswap"
        address router;     // Router address
        bool isActive;      // Whether this DEX is available for use
    }

    struct ListingParams {
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 initialLiquidityInETH;
        uint256 listingPriceInETH;     // Price per token in ETH
        uint256 maxTxAmount;           // Max transaction amount (anti-bot)
        uint256 maxWalletAmount;       // Max wallet size (anti-whale)
        bool enableTrading;            // If false, only owner can trade initially
        uint256 tradingStartTime;      // When trading becomes enabled for everyone
        string dexName;                // Name of the DEX to list on
        bool enableBuyTax;             // Enable buy tax
        bool enableSellTax;            // Enable sell tax
        uint256 buyTaxPercentage;      // Buy tax percentage (1-20%)
        uint256 sellTaxPercentage;     // Sell tax percentage (1-20%)
    }
    
    // DEX management
    mapping(string => DEXRouter) public dexRouters;
    string[] public supportedDEXes;
    
    // Token tracking
    mapping(address => bool) public listedTokens;
    mapping(address => string) public tokenDEX;  // Token => DEX name
    uint256 public listingFee;
    
    // Events
    event TokenListed(
        address indexed token,
        address indexed owner,
        string dexName,
        uint256 initialLiquidity,
        uint256 listingPrice,
        uint256 tradingStartTime
    );
    
    event DEXAdded(string name, address router);
    event DEXUpdated(string name, address router, bool isActive);
    
    constructor(uint256 _listingFee) {
        listingFee = _listingFee;
    }
    
    // DEX management functions
    function addDEX(string calldata name, address router) external onlyOwner {
        require(dexRouters[name].router == address(0), "DEX already exists");
        dexRouters[name] = DEXRouter(name, router, true);
        supportedDEXes.push(name);
        emit DEXAdded(name, router);
    }
    
    function updateDEX(string calldata name, address router, bool isActive) external onlyOwner {
        require(dexRouters[name].router != address(0), "DEX not found");
        dexRouters[name] = DEXRouter(name, router, isActive);
        emit DEXUpdated(name, router, isActive);
    }
    
    function createAndListToken(ListingParams calldata params) external payable nonReentrant {
        require(msg.value >= params.initialLiquidityInETH + listingFee, "Insufficient ETH");
        require(dexRouters[params.dexName].isActive, "DEX not available");
        require(params.buyTaxPercentage <= 20, "Buy tax too high");
        require(params.sellTaxPercentage <= 20, "Sell tax too high");
        
        // Create token
        TokenTemplate_v2 token = new TokenTemplate_v2();
        
        // Create initialization parameters
        TokenTemplate_v2.InitParams memory initParams = TokenTemplate_v2.InitParams({
            name: params.name,
            symbol: params.symbol,
            initialSupply: params.totalSupply,
            maxSupply: params.totalSupply,
            owner: msg.sender,
            enableBlacklist: true,
            enableTimeLock: true,
            presaleRate: 0,
            minContribution: 0,
            maxContribution: 0,
            presaleCap: 0,
            startTime: 0,
            endTime: 0,
            platformFeeRecipient: address(0),
            platformFeeTokens: 0,
            platformFeeVestingEnabled: false,
            platformFeeVestingDuration: 0,
            platformFeeCliffDuration: 0
        });
        
        token.initialize(initParams);
        
        // Set trading parameters
        if (params.maxTxAmount > 0) {
            token.setMaxTxAmount(params.maxTxAmount);
        }
        if (params.maxWalletAmount > 0) {
            token.setMaxWalletAmount(params.maxWalletAmount);
        }
        
        // Set tax parameters
        if (params.enableBuyTax) {
            token.setBuyTaxPercentage(params.buyTaxPercentage);
        }
        if (params.enableSellTax) {
            token.setSellTaxPercentage(params.sellTaxPercentage);
        }
        
        // Calculate liquidity amounts
        uint256 tokensForLiquidity = (params.totalSupply * 20) / 100; // 20% for liquidity
        
        // Get DEX router
        IUniswapV2Router02 router = IUniswapV2Router02(dexRouters[params.dexName].router);
        
        // Approve router
        token.approve(address(router), tokensForLiquidity);
        
        // Add liquidity
        router.addLiquidityETH{value: params.initialLiquidityInETH}(
            address(token),
            tokensForLiquidity,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this),
            block.timestamp + 300
        );
        
        // Configure trading
        if (!params.enableTrading) {
            token.setTradingEnabled(false);
        }
        if (params.tradingStartTime > 0) {
            token.setTradingStartTime(params.tradingStartTime);
        }
        
        // Transfer ownership
        token.transferOwnership(msg.sender);
        
        // Track the listing
        listedTokens[address(token)] = true;
        tokenDEX[address(token)] = params.dexName;
        
        emit TokenListed(
            address(token),
            msg.sender,
            params.dexName,
            params.initialLiquidityInETH,
            params.listingPriceInETH,
            params.tradingStartTime
        );
    }
    
    // View functions
    function getListingFee() external view returns (uint256) {
        return listingFee;
    }
    
    function isListed(address token) external view returns (bool) {
        return listedTokens[token];
    }
    
    function getSupportedDEXes() external view returns (string[] memory) {
        return supportedDEXes;
    }
    
    function getDEXRouter(string calldata dexName) external view returns (DEXRouter memory) {
        return dexRouters[dexName];
    }
    
    // Admin functions
    function setListingFee(uint256 _newFee) external onlyOwner {
        listingFee = _newFee;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 