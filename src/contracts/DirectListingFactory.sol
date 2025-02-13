// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "./TokenTemplate_v1.sol";

contract DirectListingFactory is Ownable, ReentrancyGuard {
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
    }
    
    IUniswapV2Router02 public immutable dexRouter;
    mapping(address => bool) public listedTokens;
    uint256 public listingFee;
    
    event TokenListed(
        address indexed token,
        address indexed owner,
        uint256 initialLiquidity,
        uint256 listingPrice,
        uint256 tradingStartTime
    );
    
    constructor(address _router, uint256 _listingFee) {
        dexRouter = IUniswapV2Router02(_router);
        listingFee = _listingFee;
    }
    
    function createAndListToken(ListingParams calldata params) external payable nonReentrant {
        require(msg.value >= params.initialLiquidityInETH + listingFee, "Insufficient ETH");
        
        // Create token
        TokenTemplate_v1 token = new TokenTemplate_v1();
        token.initialize(
            params.name,
            params.symbol,
            params.totalSupply,
            params.totalSupply, // Max supply same as total
            msg.sender,
            true,  // Enable blacklist for protection
            true   // Enable timelock for protection
        );
        
        // Set trading parameters
        if (params.maxTxAmount > 0) {
            token.setMaxTxAmount(params.maxTxAmount);
        }
        if (params.maxWalletAmount > 0) {
            token.setMaxWalletAmount(params.maxWalletAmount);
        }
        
        // Calculate liquidity amounts
        uint256 tokensForLiquidity = (params.totalSupply * 20) / 100; // 20% for liquidity
        uint256 initialPrice = params.listingPriceInETH;
        
        // Approve router
        token.approve(address(dexRouter), tokensForLiquidity);
        
        // Add liquidity
        dexRouter.addLiquidityETH{value: params.initialLiquidityInETH}(
            address(token),
            tokensForLiquidity,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this),
            block.timestamp + 300
        );
        
        // Enable/disable trading based on parameters
        if (!params.enableTrading) {
            token.setTradingEnabled(false);
        }
        
        // Set trading start time if specified
        if (params.tradingStartTime > 0) {
            token.setTradingStartTime(params.tradingStartTime);
        }
        
        // Transfer ownership to creator
        token.transferOwnership(msg.sender);
        
        // Track the listing
        listedTokens[address(token)] = true;
        
        emit TokenListed(
            address(token),
            msg.sender,
            params.initialLiquidityInETH,
            initialPrice,
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
    
    // Admin functions
    function setListingFee(uint256 _newFee) external onlyOwner {
        listingFee = _newFee;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 