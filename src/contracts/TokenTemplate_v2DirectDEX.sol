// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

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
    uint256 public buyTaxPercentage;
    uint256 public sellTaxPercentage;
    address public marketingWallet;
    address public developmentWallet;
    address public autoLiquidityWallet;
    
    // Blacklist
    mapping(address => bool) public isBlacklisted;
    
    // Events
    event TradingEnabled(uint256 timestamp);
    event MaxTxAmountUpdated(uint256 amount);
    event MaxWalletAmountUpdated(uint256 amount);
    event BlacklistUpdated(address account, bool isBlacklisted);
    event TaxesUpdated(uint256 buyTax, uint256 sellTax);
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
        uint256 buyTaxPercentage_,
        uint256 sellTaxPercentage_
    ) ERC20(name_, symbol_) Ownable() {
        require(totalSupply_ > 0, "Total supply must be greater than 0");
        require(maxTxAmount_ <= totalSupply_, "Max transaction amount cannot exceed total supply");
        require(maxWalletAmount_ <= totalSupply_, "Max wallet amount cannot exceed total supply");
        require(buyTaxPercentage_ <= 10, "Buy tax cannot exceed 10%");
        require(sellTaxPercentage_ <= 10, "Sell tax cannot exceed 10%");
        
        _mint(msg.sender, totalSupply_);
        
        maxTxAmount = maxTxAmount_;
        maxWalletAmount = maxWalletAmount_;
        tradingEnabled = enableTrading_;
        tradingStartTime = tradingStartTime_;
        dexRouter = dexRouter_;
        buyTaxPercentage = buyTaxPercentage_;
        sellTaxPercentage = sellTaxPercentage_;
        
        // Set default wallets
        marketingWallet = msg.sender;
        developmentWallet = msg.sender;
        autoLiquidityWallet = msg.sender;
        
        // Exclude owner and this contract from limits
        _excludeFromLimits(msg.sender);
        _excludeFromLimits(address(this));
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
    function setTaxes(uint256 buyTax, uint256 sellTax) external onlyOwner {
        require(buyTax <= 10 && sellTax <= 10, "Taxes cannot exceed 10%");
        buyTaxPercentage = buyTax;
        sellTaxPercentage = sellTax;
        emit TaxesUpdated(buyTax, sellTax);
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
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(!isBlacklisted[from] && !isBlacklisted[to], "Address is blacklisted");
        
        // Check if trading is enabled
        if (from != owner() && to != owner()) {
            require(tradingEnabled, "Trading not enabled");
            if (tradingStartTime > 0) {
                require(block.timestamp >= tradingStartTime, "Trading not started");
            }
        }
        
        // Check transaction amount
        if (from != owner() && to != owner()) {
            require(amount <= maxTxAmount, "Transfer amount exceeds maximum");
            
            // Check max wallet amount
            if (to != address(0) && to != dexPair) {
                uint256 recipientBalance = balanceOf(to);
                require(recipientBalance + amount <= maxWalletAmount, "Max wallet amount exceeded");
            }
        }
        
        // Calculate and apply taxes
        uint256 taxAmount = 0;
        if (to == dexPair) { // Sell
            taxAmount = (amount * sellTaxPercentage) / 100;
        } else if (from == dexPair) { // Buy
            taxAmount = (amount * buyTaxPercentage) / 100;
        }
        
        if (taxAmount > 0) {
            // Distribute taxes
            uint256 marketingShare = taxAmount / 3;
            uint256 developmentShare = taxAmount / 3;
            uint256 autoLiquidityShare = taxAmount - marketingShare - developmentShare;
            
            super._transfer(from, marketingWallet, marketingShare);
            super._transfer(from, developmentWallet, developmentShare);
            super._transfer(from, autoLiquidityWallet, autoLiquidityShare);
            
            amount -= taxAmount;
        }
        
        super._transfer(from, to, amount);
    }
} 