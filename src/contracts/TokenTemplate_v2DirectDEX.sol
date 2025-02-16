// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface ITokenFactory {
    function _accumulateAutoLiquidity(address token, uint256 amount) external;
}

contract TokenTemplate_v2DirectDEX is ERC20, Ownable, ReentrancyGuard {
    using Address for address;

    // Token Info
    uint256 public constant VERSION = 2;
    bytes32 public constant VERSION_HASH = keccak256("TOKEN_TEMPLATE_V2_DIRECTDEX");
    
    // Trading Settings
    bool public tradingEnabled;
    uint256 public tradingStartTime;
    uint256 public maxTxAmount;
    uint256 public maxWalletAmount;
    
    // DEX Settings
    address public dexRouter;
    address public dexPair;
    
    // Fee Settings
    uint256 public marketingFeePercentage;
    uint256 public developmentFeePercentage;
    uint256 public autoLiquidityFeePercentage;
    address public marketingWallet;
    address public developmentWallet;
    address public autoLiquidityWallet;
    bool public enableBuyFees;
    bool public enableSellFees;
    
    // Auto-Liquidity Settings
    uint256 public constant MIN_TOKENS_FOR_LIQUIDITY = 1000; // Minimum tokens needed for auto-liquidity
    mapping(address => bool) public isExcludedFromAutoLiquidity;
    
    // Blacklist
    mapping(address => bool) public isBlacklisted;
    
    // Events
    event TradingEnabled(uint256 timestamp);
    event MaxTxAmountUpdated(uint256 amount);
    event MaxWalletAmountUpdated(uint256 amount);
    event BlacklistUpdated(address account, bool isBlacklisted);
    event TaxesUpdated(uint256 totalFees);
    event WalletsUpdated(address marketing, address development, address autoLiquidity);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint256 maxTxAmount_,
        uint256 maxWalletAmount_,
        bool enableTrading_,
        uint256 tradingStartTime_,
        address dexRouter_,
        uint256 marketingFeePercentage_,
        uint256 developmentFeePercentage_,
        uint256 autoLiquidityFeePercentage_,
        address marketingWallet_,
        address developmentWallet_,
        address autoLiquidityWallet_,
        bool enableBuyFees_,
        bool enableSellFees_
    ) ERC20(name_, symbol_) Ownable() {
        require(totalSupply_ > 0, "Total supply must be greater than 0");
        require(maxTxAmount_ <= totalSupply_, "Max transaction amount cannot exceed total supply");
        require(maxWalletAmount_ <= totalSupply_, "Max wallet amount cannot exceed total supply");
        require(marketingFeePercentage_ + developmentFeePercentage_ + autoLiquidityFeePercentage_ <= 25, "Total fees cannot exceed 25%");
        require(marketingWallet_ != address(0), "Marketing wallet cannot be zero address");
        require(developmentWallet_ != address(0), "Development wallet cannot be zero address");
        require(autoLiquidityWallet_ != address(0), "Auto-liquidity wallet cannot be zero address");
        
        // Set up the token parameters first
        maxTxAmount = maxTxAmount_;
        maxWalletAmount = maxWalletAmount_;
        tradingEnabled = enableTrading_;
        tradingStartTime = tradingStartTime_;
        dexRouter = dexRouter_;
        
        marketingFeePercentage = marketingFeePercentage_;
        developmentFeePercentage = developmentFeePercentage_;
        autoLiquidityFeePercentage = autoLiquidityFeePercentage_;
        
        marketingWallet = marketingWallet_;
        developmentWallet = developmentWallet_;
        autoLiquidityWallet = autoLiquidityWallet_;
        
        enableBuyFees = enableBuyFees_;
        enableSellFees = enableSellFees_;
        
        // Exclude critical addresses from fees and limits
        isExcludedFromAutoLiquidity[msg.sender] = true;
        isExcludedFromAutoLiquidity[address(this)] = true;
        isExcludedFromAutoLiquidity[marketingWallet_] = true;
        isExcludedFromAutoLiquidity[developmentWallet_] = true;
        isExcludedFromAutoLiquidity[autoLiquidityWallet_] = true;
        isExcludedFromAutoLiquidity[dexRouter_] = true;  // Exclude DEX router
        
        // Calculate liquidity amount
        uint256 tokensForLiquidity = (totalSupply_ * 20) / 100; // 20% for liquidity
        uint256 remainingTokens = totalSupply_ - tokensForLiquidity;
        
        // First mint tokens to the factory for liquidity
        _mint(autoLiquidityWallet_, tokensForLiquidity);
        
        // Then mint remaining tokens to the deployer
        _mint(msg.sender, remainingTokens);
        
        // Set up allowances
        _approve(autoLiquidityWallet_, dexRouter_, type(uint256).max);
        
        _transferOwnership(msg.sender);
    }
    
    // Trading Control Functions
    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
        if (tradingStartTime == 0) {
            tradingStartTime = block.timestamp;
        }
        emit TradingEnabled(tradingStartTime);
    }
    
    function setMaxTxAmount(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= totalSupply(), "Amount cannot exceed total supply");
        maxTxAmount = amount;
        emit MaxTxAmountUpdated(amount);
    }
    
    function setMaxWalletAmount(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= totalSupply(), "Amount cannot exceed total supply");
        maxWalletAmount = amount;
        emit MaxWalletAmountUpdated(amount);
    }
    
    // Blacklist Functions
    function setBlacklist(address account, bool blacklisted) external onlyOwner {
        require(account != address(0), "Invalid address");
        isBlacklisted[account] = blacklisted;
        emit BlacklistUpdated(account, blacklisted);
    }
    
    // Tax Functions
    function setTaxes(
        uint256 marketingFee,
        uint256 developmentFee,
        uint256 autoLiquidityFee
    ) external onlyOwner {
        require(marketingFee + developmentFee + autoLiquidityFee <= 25, "Total fees cannot exceed 25%");
        marketingFeePercentage = marketingFee;
        developmentFeePercentage = developmentFee;
        autoLiquidityFeePercentage = autoLiquidityFee;
        emit TaxesUpdated(marketingFee + developmentFee + autoLiquidityFee);
    }
    
    function setWallets(
        address marketing,
        address development,
        address autoLiquidity
    ) external onlyOwner {
        require(marketing != address(0) && development != address(0) && autoLiquidity != address(0), "Invalid address");
        marketingWallet = marketing;
        developmentWallet = development;
        autoLiquidityWallet = autoLiquidity;
        emit WalletsUpdated(marketing, development, autoLiquidity);
    }
    
    // Internal Functions
    function _excludeFromLimits(address account) internal {
        // Implementation for excluding addresses from transaction and wallet limits
    }
    
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(!isBlacklisted[from] && !isBlacklisted[to], "Blacklisted address");
        
        // Skip trading checks and fees for excluded addresses or initial setup
        if (isExcludedFromAutoLiquidity[from] || isExcludedFromAutoLiquidity[to] || 
            (from == owner() && to == autoLiquidityWallet)) {
            super._transfer(from, to, amount);
            return;
        }
        
        require(tradingEnabled || from == owner() || to == owner(), "Trading not enabled");
        if (tradingStartTime > 0) {
            require(block.timestamp >= tradingStartTime, "Trading not started");
        }
        
        if (maxTxAmount > 0) {
            require(amount <= maxTxAmount, "Exceeds max transaction amount");
        }
        
        if (maxWalletAmount > 0 && !isExcludedFromAutoLiquidity[to]) {
            require(balanceOf(to) + amount <= maxWalletAmount, "Exceeds max wallet amount");
        }
        
        uint256 totalTaxAmount = 0;
        
        if (to == dexPair || from == dexPair) { // Buy or Sell
            bool isBuy = from == dexPair;
            bool shouldApplyFees = (isBuy && enableBuyFees) || (!isBuy && enableSellFees);
            
            if (shouldApplyFees) {
                uint256 marketingAmount = (amount * marketingFeePercentage) / 100;
                uint256 developmentAmount = (amount * developmentFeePercentage) / 100;
                uint256 autoLiquidityAmount = (amount * autoLiquidityFeePercentage) / 100;
                
                totalTaxAmount = marketingAmount + developmentAmount + autoLiquidityAmount;
                
                if (totalTaxAmount > 0) {
                    // Check if sender has enough balance for transfer + fees
                    require(balanceOf(from) >= amount, "Insufficient balance for transfer");
                    
                    // First transfer the main amount
                    uint256 transferAmount = amount - totalTaxAmount;
                    super._transfer(from, to, transferAmount);
                    
                    // Then handle the fees
                    if (marketingAmount > 0) {
                        super._transfer(from, marketingWallet, marketingAmount);
                    }
                    if (developmentAmount > 0) {
                        super._transfer(from, developmentWallet, developmentAmount);
                    }
                    
                    // Handle auto-liquidity last
                    if (autoLiquidityAmount > 0) {
                        super._transfer(from, autoLiquidityWallet, autoLiquidityAmount);
                        
                        // If this is a sell, convert half to ETH for liquidity
                        if (!isBuy && balanceOf(autoLiquidityWallet) >= MIN_TOKENS_FOR_LIQUIDITY) {
                            uint256 halfAmount = autoLiquidityAmount / 2;
                            ITokenFactory(autoLiquidityWallet)._accumulateAutoLiquidity(
                                address(this),
                                halfAmount
                            );
                        }
                    }
                    
                    return; // Skip the final transfer since we already did it
                }
            }
        }
        
        super._transfer(from, to, amount);
    }
    
    // Auto-liquidity management functions
    function excludeFromAutoLiquidity(address account, bool excluded) external onlyOwner {
        isExcludedFromAutoLiquidity[account] = excluded;
    }

    // Set pair address
    function setPair(address _pair) external {
        require(msg.sender == autoLiquidityWallet, "Only factory can set pair");
        require(dexPair == address(0), "Pair already set");
        dexPair = _pair;
        isExcludedFromAutoLiquidity[_pair] = true;
    }

    // Set router address
    function setRouter(address _router) external {
        require(msg.sender == autoLiquidityWallet, "Only factory can set router");
        require(dexRouter == address(0), "Router already set");
        dexRouter = _router;
        isExcludedFromAutoLiquidity[_router] = true;
    }

    // Add functions to toggle buy/sell fees
    function setEnableBuyFees(bool enable) external onlyOwner {
        enableBuyFees = enable;
    }

    function setEnableSellFees(bool enable) external onlyOwner {
        enableSellFees = enable;
    }
} 