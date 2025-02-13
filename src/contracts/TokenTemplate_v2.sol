// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract TokenTemplate_v2 is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    string public constant VERSION = "2.0.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));
    
    struct PresaleInfo {
        uint256 softCap;
        uint256 hardCap;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 startTime;
        uint256 endTime;
        uint256 presaleRate;
        bool whitelistEnabled;
        bool finalized;
        uint256 totalContributed;
    }

    // Contract state variables
    PresaleInfo public presaleInfo;
    mapping(address => bool) public whitelist;
    mapping(address => uint256) public contributions;
    uint256 public maxSupply;
    bool public blacklistEnabled;
    bool public timeLockEnabled;
    mapping(address => bool) public blacklist;
    mapping(address => uint256) public timeLocks;
    
    // Platform fee info
    address public platformFeeRecipient;
    uint256 public platformFeeTokens;
    bool public platformFeeVestingEnabled;
    uint256 public platformFeeVestingDuration;
    uint256 public platformFeeCliffDuration;
    uint256 public platformFeeVestingStart;
    uint256 public platformFeeTokensClaimed;

    // Enhanced trading controls
    bool public tradingEnabled;
    uint256 public tradingStartTime;
    uint256 public maxTxAmount;
    uint256 public maxWalletAmount;
    
    // Tax system
    uint256 public buyTaxPercentage;
    uint256 public sellTaxPercentage;
    address public taxWallet;
    mapping(address => bool) public isExcludedFromTax;
    
    // Anti-bot
    mapping(address => uint256) public lastTrade;
    uint256 public cooldownTime;
    uint256 public snipingProtectionTime;
    uint256 public launchTime;
    
    // DEX pairs
    mapping(address => bool) public isDexPair;
    
    // Events
    event PresaleStarted(
        uint256 softCap,
        uint256 hardCap,
        uint256 startTime,
        uint256 endTime,
        uint256 presaleRate
    );
    event WhitelistUpdated(address[] addresses, bool status);
    event BlacklistUpdated(address[] addresses, bool status);
    event TimeLockSet(address account, uint256 unlockTime);
    event ContributionReceived(address contributor, uint256 amount);
    event PresaleFinalized(uint256 totalContributed, uint256 tokensDistributed);
    event ContributionRefunded(address contributor, uint256 amount);
    event PlatformFeeClaimed(uint256 amount);
    event TradingEnabled(bool status);
    event TradingStartTimeSet(uint256 timestamp);
    event MaxTxAmountSet(uint256 amount);
    event MaxWalletAmountSet(uint256 amount);
    event TaxUpdated(string taxType, uint256 percentage);
    event TaxWalletUpdated(address newWallet);
    event PairAdded(address pair);
    event CooldownUpdated(uint256 time);
    event SnipingProtectionUpdated(uint256 time);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    struct InitParams {
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 maxSupply;
        address owner;
        bool enableBlacklist;
        bool enableTimeLock;
        uint256 presaleRate;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 presaleCap;
        uint256 startTime;
        uint256 endTime;
        address platformFeeRecipient;
        uint256 platformFeeTokens;
        bool platformFeeVestingEnabled;
        uint256 platformFeeVestingDuration;
        uint256 platformFeeCliffDuration;
    }

    function initialize(InitParams calldata params) public initializer {
        __ERC20_init(params.name, params.symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        require(params.maxSupply >= params.initialSupply, "Max supply must be >= initial supply");
        require(params.startTime > block.timestamp, "Start time must be in future");
        require(params.endTime > params.startTime, "End time must be after start time");

        maxSupply = params.maxSupply;
        blacklistEnabled = params.enableBlacklist;
        timeLockEnabled = params.enableTimeLock;
        platformFeeRecipient = params.platformFeeRecipient;
        platformFeeTokens = params.platformFeeTokens;
        platformFeeVestingEnabled = params.platformFeeVestingEnabled;
        platformFeeVestingDuration = params.platformFeeVestingDuration;
        platformFeeCliffDuration = params.platformFeeCliffDuration;

        // Initialize presale info
        presaleInfo = PresaleInfo({
            softCap: params.presaleCap / 2,
            hardCap: params.presaleCap,
            minContribution: params.minContribution,
            maxContribution: params.maxContribution,
            startTime: params.startTime,
            endTime: params.endTime,
            presaleRate: params.presaleRate,
            whitelistEnabled: false,
            finalized: false,
            totalContributed: 0
        });

        // Mint initial supply to owner
        _mint(params.owner, params.initialSupply);
        
        // Handle platform fee tokens
        if (params.platformFeeTokens > 0 && params.platformFeeRecipient != address(0)) {
            if (!params.platformFeeVestingEnabled) {
                _mint(params.platformFeeRecipient, params.platformFeeTokens);
            } else {
                platformFeeVestingStart = block.timestamp;
            }
        }

        emit PresaleStarted(
            presaleInfo.softCap,
            presaleInfo.hardCap,
            params.startTime,
            params.endTime,
            params.presaleRate
        );
    }

    function contribute() external payable nonReentrant {
        require(block.timestamp >= presaleInfo.startTime, "Presale not started");
        require(block.timestamp <= presaleInfo.endTime, "Presale ended");
        require(!presaleInfo.finalized, "Presale finalized");
        require(msg.value >= presaleInfo.minContribution, "Below min contribution");
        require(msg.value <= presaleInfo.maxContribution, "Above max contribution");
        require(
            presaleInfo.totalContributed + msg.value <= presaleInfo.hardCap,
            "Hard cap reached"
        );

        if (presaleInfo.whitelistEnabled) {
            require(whitelist[msg.sender], "Not whitelisted");
        }

        uint256 newContribution = contributions[msg.sender] + msg.value;
        require(
            newContribution <= presaleInfo.maxContribution,
            "Would exceed max contribution"
        );

        contributions[msg.sender] = newContribution;
        presaleInfo.totalContributed += msg.value;

        emit ContributionReceived(msg.sender, msg.value);
    }

    function finalize() external onlyOwner nonReentrant {
        require(block.timestamp > presaleInfo.endTime, "Presale not ended");
        require(!presaleInfo.finalized, "Already finalized");
        require(
            presaleInfo.totalContributed >= presaleInfo.softCap,
            "Soft cap not reached"
        );

        presaleInfo.finalized = true;
        uint256 tokensToDistribute = presaleInfo.totalContributed * presaleInfo.presaleRate;

        // Transfer raised funds to owner
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");

        emit PresaleFinalized(presaleInfo.totalContributed, tokensToDistribute);
    }

    function claimPlatformFeeTokens() external nonReentrant {
        require(msg.sender == platformFeeRecipient, "Not fee recipient");
        require(platformFeeVestingEnabled, "Vesting not enabled");
        require(block.timestamp >= platformFeeVestingStart + platformFeeCliffDuration, "Cliff period not ended");
        
        uint256 vestedAmount = _calculateVestedAmount();
        uint256 claimableAmount = vestedAmount - platformFeeTokensClaimed;
        require(claimableAmount > 0, "No tokens to claim");

        platformFeeTokensClaimed += claimableAmount;
        _mint(platformFeeRecipient, claimableAmount);

        emit PlatformFeeClaimed(claimableAmount);
    }

    function _calculateVestedAmount() internal view returns (uint256) {
        if (block.timestamp < platformFeeVestingStart + platformFeeCliffDuration) {
            return 0;
        }
        
        if (block.timestamp >= platformFeeVestingStart + platformFeeVestingDuration) {
            return platformFeeTokens;
        }

        uint256 timeFromCliff = block.timestamp - (platformFeeVestingStart + platformFeeCliffDuration);
        uint256 vestingTime = platformFeeVestingDuration - platformFeeCliffDuration;
        
        return (platformFeeTokens * timeFromCliff) / vestingTime;
    }

    function getVestingInfo() external view returns (
        uint256 totalTokens,
        uint256 claimed,
        uint256 claimable,
        uint256 vestingEnd
    ) {
        totalTokens = platformFeeTokens;
        claimed = platformFeeTokensClaimed;
        claimable = platformFeeVestingEnabled ? 
            _calculateVestedAmount() - platformFeeTokensClaimed : 
            platformFeeTokens - platformFeeTokensClaimed;
        vestingEnd = platformFeeVestingStart + platformFeeVestingDuration;
    }

    function updateWhitelist(address[] calldata addresses, bool status) external onlyOwner {
        require(presaleInfo.whitelistEnabled, "Whitelist not enabled");
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = status;
        }
        emit WhitelistUpdated(addresses, status);
    }

    function updateBlacklist(address[] calldata addresses, bool status) external onlyOwner {
        require(blacklistEnabled, "Blacklist not enabled");
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklist[addresses[i]] = status;
        }
        emit BlacklistUpdated(addresses, status);
    }

    function setTimeLock(address account, uint256 unlockTime) external onlyOwner {
        require(timeLockEnabled, "Time lock not enabled");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        timeLocks[account] = unlockTime;
        emit TimeLockSet(account, unlockTime);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);

        if (blacklistEnabled) {
            require(!blacklist[from] && !blacklist[to], "Address is blacklisted");
        }

        if (timeLockEnabled && from != address(0)) {
            require(block.timestamp >= timeLocks[from], "Tokens are time-locked");
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // DEX pair management
    function setDexPair(address pair, bool status) external onlyOwner {
        isDexPair[pair] = status;
        emit PairAdded(pair);
    }
    
    // Tax management
    function setBuyTaxPercentage(uint256 percentage) external onlyOwner {
        require(percentage <= 20, "Max 20%");
        buyTaxPercentage = percentage;
        emit TaxUpdated("buy", percentage);
    }
    
    function setSellTaxPercentage(uint256 percentage) external onlyOwner {
        require(percentage <= 20, "Max 20%");
        sellTaxPercentage = percentage;
        emit TaxUpdated("sell", percentage);
    }
    
    function setTaxWallet(address wallet) external onlyOwner {
        require(wallet != address(0), "Invalid address");
        taxWallet = wallet;
        emit TaxWalletUpdated(wallet);
    }
    
    function excludeFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
    }
    
    // Anti-bot settings
    function setCooldownTime(uint256 time) external onlyOwner {
        cooldownTime = time;
        emit CooldownUpdated(time);
    }
    
    function setSnipingProtectionTime(uint256 time) external onlyOwner {
        snipingProtectionTime = time;
        emit SnipingProtectionUpdated(time);
    }
    
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(from != address(0), "Transfer from zero");
        require(to != address(0), "Transfer to zero");
        
        // Trading checks
        if (from != owner() && to != owner()) {
            require(tradingEnabled, "Trading not enabled");
            if (tradingStartTime > 0) {
                require(block.timestamp >= tradingStartTime, "Trading not started");
            }
            
            // Sniping protection
            if (launchTime > 0 && block.timestamp - launchTime <= snipingProtectionTime) {
                require(!isDexPair[from], "Sniping protection");
            }
            
            // Cooldown check
            if (cooldownTime > 0) {
                require(block.timestamp >= lastTrade[from] + cooldownTime, "Cooldown active");
                lastTrade[from] = block.timestamp;
            }
            
            // Amount checks
            if (maxTxAmount > 0) {
                require(amount <= maxTxAmount, "Exceeds max tx");
            }
            if (maxWalletAmount > 0 && !isDexPair[to]) {
                require(balanceOf(to) + amount <= maxWalletAmount, "Exceeds wallet max");
            }
        }
        
        // Tax calculation
        uint256 taxAmount = 0;
        if (!isExcludedFromTax[from] && !isExcludedFromTax[to]) {
            if (isDexPair[from]) {  // Buy
                taxAmount = (amount * buyTaxPercentage) / 100;
            } else if (isDexPair[to]) {  // Sell
                taxAmount = (amount * sellTaxPercentage) / 100;
            }
        }
        
        if (taxAmount > 0) {
            super._transfer(from, taxWallet, taxAmount);
            amount -= taxAmount;
        }
        
        super._transfer(from, to, amount);
    }
    
    // Trading control functions
    function setTradingEnabled(bool _status) external onlyOwner {
        tradingEnabled = _status;
        if (_status && launchTime == 0) {
            launchTime = block.timestamp;
        }
        emit TradingEnabled(_status);
    }
    
    function setTradingStartTime(uint256 _timestamp) external onlyOwner {
        require(_timestamp > block.timestamp, "Invalid time");
        tradingStartTime = _timestamp;
        emit TradingStartTimeSet(_timestamp);
    }
    
    function setMaxTxAmount(uint256 _amount) external onlyOwner {
        maxTxAmount = _amount;
        emit MaxTxAmountSet(_amount);
    }
    
    function setMaxWalletAmount(uint256 _amount) external onlyOwner {
        maxWalletAmount = _amount;
        emit MaxWalletAmountSet(_amount);
    }
} 