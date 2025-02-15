// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "./TokenTemplate_v2DirectDEX.sol";

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
        
        // Marketing Fee Configuration
        uint256 marketingFeePercentage;
        address marketingWallet;
        
        // Development Fee Configuration
        uint256 developmentFeePercentage;
        address developmentWallet;
        
        // Auto-Liquidity Fee Configuration
        uint256 autoLiquidityFeePercentage;
    }
    
    // DEX management
    mapping(string => DEXRouter) public dexRouters;
    string[] public supportedDEXes;
    
    // Token tracking
    mapping(address => bool) public listedTokens;
    mapping(address => string) public tokenDEX;  // Token => DEX name
    uint256 public listingFee;
    
    // Auto-Liquidity Security Settings
    uint256 public constant MIN_AUTO_LIQUIDITY_THRESHOLD = 0.01 ether; // Minimum amount for auto-liquidity
    uint256 public constant AUTO_LIQUIDITY_COOLDOWN = 24 hours; // Cooldown between auto-liquidity additions
    mapping(address => uint256) public lastAutoLiquidityTime; // Last auto-liquidity addition time per token
    mapping(address => uint256) public pendingAutoLiquidity; // Pending auto-liquidity amount per token
    bool public autoLiquidityPaused; // Emergency pause for auto-liquidity
    
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
    
    event AutoLiquidityAdded(address indexed token, uint256 ethAmount, uint256 tokenAmount);
    event AutoLiquidityPaused(bool isPaused);
    event EmergencyAutoLiquidityWithdrawn(address indexed token, uint256 amount);
    
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
        
        // Validate fee percentages and wallet addresses together
        require(params.marketingFeePercentage > 0 && params.marketingWallet != address(0), "Invalid marketing configuration");
        require(params.developmentFeePercentage > 0 && params.developmentWallet != address(0), "Invalid development configuration");
        require(params.autoLiquidityFeePercentage > 0, "Invalid auto-liquidity configuration");
        require(
            params.marketingFeePercentage + 
            params.developmentFeePercentage + 
            params.autoLiquidityFeePercentage <= 25, 
            "Total fees too high"
        );
        
        // Get DEX router
        IUniswapV2Router02 router = IUniswapV2Router02(dexRouters[params.dexName].router);
        
        // Create token with constructor parameters
        TokenTemplate_v2DirectDEX token = new TokenTemplate_v2DirectDEX(
            params.name,
            params.symbol,
            params.totalSupply,
            params.maxTxAmount,
            params.maxWalletAmount,
            params.enableTrading,
            params.tradingStartTime,
            address(router),
            params.marketingFeePercentage,
            params.developmentFeePercentage,
            params.autoLiquidityFeePercentage,
            params.marketingWallet,
            params.developmentWallet,
            address(this)  // Auto-liquidity wallet is the factory contract
        );
        
        // Calculate liquidity amounts
        uint256 tokensForLiquidity = (params.totalSupply * 20) / 100; // 20% for liquidity
        
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
    
    // Auto-Liquidity Management Functions
    function addAutoLiquidity(address token) external nonReentrant {
        require(!autoLiquidityPaused, "Auto-liquidity is paused");
        require(listedTokens[token], "Token not listed");
        require(block.timestamp >= lastAutoLiquidityTime[token] + AUTO_LIQUIDITY_COOLDOWN, "Cooldown active");
        require(pendingAutoLiquidity[token] >= MIN_AUTO_LIQUIDITY_THRESHOLD, "Below threshold");
        
        uint256 ethAmount = pendingAutoLiquidity[token];
        pendingAutoLiquidity[token] = 0;
        
        // Get DEX router
        string memory dexName = tokenDEX[token];
        IUniswapV2Router02 router = IUniswapV2Router02(dexRouters[dexName].router);
        
        // Get token balance
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        require(tokenBalance > 0, "No tokens for liquidity");
        
        // Approve router
        IERC20(token).approve(address(router), tokenBalance);
        
        // Add liquidity
        router.addLiquidityETH{value: ethAmount}(
            token,
            tokenBalance,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this), // Keep LP tokens in factory
            block.timestamp + 300
        );
        
        lastAutoLiquidityTime[token] = block.timestamp;
        
        emit AutoLiquidityAdded(token, ethAmount, tokenBalance);
    }
    
    // Emergency Functions
    function setAutoLiquidityPause(bool pause) external onlyOwner {
        autoLiquidityPaused = pause;
        emit AutoLiquidityPaused(pause);
    }
    
    function emergencyWithdrawAutoLiquidity(address token) external onlyOwner {
        require(listedTokens[token], "Token not listed");
        uint256 amount = pendingAutoLiquidity[token];
        require(amount > 0, "No pending liquidity");
        
        pendingAutoLiquidity[token] = 0;
        payable(owner()).transfer(amount);
        
        emit EmergencyAutoLiquidityWithdrawn(token, amount);
    }
    
    // Internal function to accumulate auto-liquidity
    function _accumulateAutoLiquidity(address token, uint256 amount) internal {
        pendingAutoLiquidity[token] += amount;
    }
} 