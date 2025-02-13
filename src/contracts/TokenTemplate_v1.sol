// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TokenTemplate_v1
 * @dev Template for creating new ERC20 tokens with optional features
 * @author TokenFactory
 * @notice Version: 1.0.0
 */
contract TokenTemplate_v1 is 
    Initializable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // Version info
    string public constant VERSION = "1.0.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));
    
    uint256 private _maxSupply;
    mapping(address => bool) private _blacklist;
    mapping(address => uint256) private _lockTime;
    bool public blacklistEnabled;
    bool public timeLockEnabled;

    // Trading control
    bool public tradingEnabled;
    uint256 public tradingStartTime;
    uint256 public maxTxAmount;
    uint256 public maxWalletAmount;
    
    event BlacklistUpdated(address indexed account, bool status);
    event TimeLockSet(address indexed account, uint256 timestamp);
    event FeatureToggled(string feature, bool status);
    event TradingEnabled(bool status);
    event TradingStartTimeSet(uint256 timestamp);
    event MaxTxAmountSet(uint256 amount);
    event MaxWalletAmountSet(uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply_,
        address owner,
        bool enableBlacklist,
        bool enableTimeLock
    ) public initializer {
        __ERC20_init(name, symbol);
        __ERC20Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        
        if (owner != address(0)) {
            _transferOwnership(owner);
        }

        require(maxSupply_ == 0 || maxSupply_ >= initialSupply, "Max supply must be 0 or >= initial supply");
        _maxSupply = maxSupply_ == 0 ? type(uint256).max : maxSupply_;
        blacklistEnabled = enableBlacklist;
        timeLockEnabled = enableTimeLock;
        _mint(owner, initialSupply);
    }

    // Minting
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= _maxSupply, "Exceeds max supply");
        _mint(to, amount);
    }

    // Blacklist functions
    function setBlacklistStatus(address account, bool status) public onlyOwner {
        require(blacklistEnabled, "Blacklist feature not enabled");
        _blacklist[account] = status;
        emit BlacklistUpdated(account, status);
    }

    function isBlacklisted(address account) public view returns (bool) {
        return blacklistEnabled && _blacklist[account];
    }

    // Time lock functions
    function setLockTime(address account, uint256 timestamp) public onlyOwner {
        require(timeLockEnabled, "Time lock feature not enabled");
        require(timestamp > block.timestamp, "Lock time must be in future");
        _lockTime[account] = timestamp;
        emit TimeLockSet(account, timestamp);
    }

    function getLockTime(address account) public view returns (uint256) {
        return _lockTime[account];
    }

    // Feature management
    function toggleBlacklist(bool status) public onlyOwner {
        blacklistEnabled = status;
        emit FeatureToggled("blacklist", status);
    }

    function toggleTimeLock(bool status) public onlyOwner {
        timeLockEnabled = status;
        emit FeatureToggled("timelock", status);
    }

    // View functions
    function maxSupply() public view returns (uint256) {
        return _maxSupply;
    }

    // Override transfer functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Skip checks for minting and burning
        if (from == address(0) || to == address(0)) return;
        
        // Check if trading is enabled
        require(tradingEnabled || from == owner() || to == owner(), "Trading not enabled");
        
        // Check trading start time
        if (tradingStartTime > 0) {
            require(block.timestamp >= tradingStartTime, "Trading not started");
        }
        
        // Check max transaction amount
        if (maxTxAmount > 0) {
            require(amount <= maxTxAmount, "Exceeds max tx amount");
        }
        
        // Check max wallet amount
        if (maxWalletAmount > 0 && to != address(0)) {
            uint256 recipientBalance = balanceOf(to);
            require(recipientBalance + amount <= maxWalletAmount, "Exceeds max wallet amount");
        }
        
        // Check blacklist
        if (blacklistEnabled) {
            require(!_blacklist[from] && !_blacklist[to], "Address blacklisted");
        }
        
        // Check timelock
        if (timeLockEnabled) {
            require(block.timestamp >= _lockTime[from], "Sender timelocked");
            require(block.timestamp >= _lockTime[to], "Recipient timelocked");
        }
    }

    // Trading control functions
    function setTradingEnabled(bool _status) external onlyOwner {
        tradingEnabled = _status;
        emit TradingEnabled(_status);
    }
    
    function setTradingStartTime(uint256 _timestamp) external onlyOwner {
        require(_timestamp > block.timestamp, "Invalid timestamp");
        tradingStartTime = _timestamp;
        emit TradingStartTimeSet(_timestamp);
    }
    
    function setMaxTxAmount(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Invalid amount");
        maxTxAmount = _amount;
        emit MaxTxAmountSet(_amount);
    }
    
    function setMaxWalletAmount(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Invalid amount");
        maxWalletAmount = _amount;
        emit MaxWalletAmountSet(_amount);
    }

    // Pause/Unpause
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 