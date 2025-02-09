// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract TokenTemplate_v3 is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    string public constant VERSION = "3.0.0";
    
    // User tracking
    mapping(address => bool) public isUser;
    address[] public users;
    uint256 public userCount;
    
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
    
    // Distribution tracking
    address[] public contributors;
    mapping(address => bool) public isContributor;
    mapping(address => uint256) public presaleContributorTokens;
    uint256 public totalPresaleTokensDistributed;
    
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
    event ContributionReceived(address contributor, uint256 amount, uint256 tokenAmount);
    event PresaleFinalized(uint256 totalContributed, uint256 totalTokensDistributed);
    event ContributionRefunded(address contributor, uint256 amount);
    event TokensDistributed(address indexed recipient, uint256 amount);
    event LiquidityPoolCreated(address indexed pair, uint256 tokensAdded, uint256 ethAdded);
    event PresaleParticipation(address indexed contributor, uint256 amount, uint256 tokensReceived);
    event RefundClaimed(address indexed contributor, uint256 amount);

    struct WalletAllocation {
        address wallet;
        uint256 percentage;
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
        uint256 presalePercentage;
        uint256 liquidityPercentage;
        uint256 liquidityLockDuration;
        WalletAllocation[] walletAllocations;  // New dynamic wallet allocations
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(InitParams calldata params) public initializer {
        __ERC20_init(params.name, params.symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _transferOwnership(params.owner);

        require(params.maxSupply >= params.initialSupply, "Max supply must be >= initial supply");
        
        // Validate wallet allocations - now allows any number of wallets
        if (params.walletAllocations.length > 0) {
            // Calculate total percentage including presale and liquidity
            uint256 totalPercentage = params.presalePercentage + params.liquidityPercentage;
            
            // Add percentages from wallet allocations
            for (uint256 i = 0; i < params.walletAllocations.length; i++) {
                require(params.walletAllocations[i].wallet != address(0), "Wallet address cannot be zero");
                require(params.walletAllocations[i].percentage > 0, "Percentage must be > 0");
                totalPercentage += params.walletAllocations[i].percentage;
            }
            
            require(totalPercentage == 100, "Total percentage must be 100");
        } else {
            // If no additional wallets, presale and liquidity must total 100%
            require(params.presalePercentage + params.liquidityPercentage == 100, 
                    "Presale and liquidity must total 100% when no additional wallets");
        }

        maxSupply = params.maxSupply;
        blacklistEnabled = params.enableBlacklist;
        timeLockEnabled = params.enableTimeLock;

        // Calculate token allocations
        uint256 presaleTokens = (params.initialSupply * params.presalePercentage) / 100;
        uint256 liquidityTokens = (params.initialSupply * params.liquidityPercentage) / 100;

        // Validate token amounts
        require(presaleTokens > 0, "Presale tokens must be > 0");
        require(liquidityTokens > 0, "Liquidity tokens must be > 0");

        // Mint presale tokens to the contract itself
        _mint(address(this), presaleTokens);
        emit TokensDistributed(address(this), presaleTokens);

        // Mint liquidity tokens to the contract itself
        _mint(address(this), liquidityTokens);
        emit TokensDistributed(address(this), liquidityTokens);

        // Initialize presale info
        presaleInfo = PresaleInfo({
            softCap: params.presaleCap / 2, // Set soft cap to half of presale cap
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

        // Mint tokens for each wallet allocation
        for (uint256 i = 0; i < params.walletAllocations.length; i++) {
            uint256 walletTokens = (params.initialSupply * params.walletAllocations[i].percentage) / 100;
            require(walletTokens > 0, "Wallet tokens must be > 0");
            _mint(params.walletAllocations[i].wallet, walletTokens);
            emit TokensDistributed(params.walletAllocations[i].wallet, walletTokens);
            _addUser(params.walletAllocations[i].wallet);
        }
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

        // Track contributor
        if (!isContributor[msg.sender]) {
            contributors.push(msg.sender);
            isContributor[msg.sender] = true;
        }

        // Calculate and track tokens
        uint256 tokensToReceive = msg.value * presaleInfo.presaleRate;
        presaleContributorTokens[msg.sender] += tokensToReceive;

        // Update contribution tracking
        contributions[msg.sender] = newContribution;
        presaleInfo.totalContributed += msg.value;

        emit ContributionReceived(msg.sender, msg.value, tokensToReceive);
    }

    function finalize() external onlyOwner nonReentrant {
        require(block.timestamp > presaleInfo.endTime, "Presale not ended");
        require(!presaleInfo.finalized, "Already finalized");
        require(
            presaleInfo.totalContributed >= presaleInfo.softCap,
            "Soft cap not reached"
        );

        presaleInfo.finalized = true;

        // Distribute presale tokens to contributors
        for (uint256 i = 0; i < contributors.length; i++) {
            address contributor = contributors[i];
            uint256 tokensToDistribute = presaleContributorTokens[contributor];
            
            if (tokensToDistribute > 0) {
                require(transfer(contributor, tokensToDistribute), "Token transfer failed");
                totalPresaleTokensDistributed += tokensToDistribute;
                emit TokensDistributed(contributor, tokensToDistribute);
                
                // Clear the allocation after distribution
                presaleContributorTokens[contributor] = 0;
            }
        }

        // Transfer remaining ETH to owner
        uint256 remainingBalance = address(this).balance;
        if (remainingBalance > 0) {
            (bool success, ) = owner().call{value: remainingBalance}("");
            require(success, "ETH transfer failed");
        }

        emit PresaleFinalized(presaleInfo.totalContributed, totalPresaleTokensDistributed);
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
        if (blacklistEnabled) {
            require(!blacklist[from] && !blacklist[to], "Address blacklisted");
        }
        if (timeLockEnabled && from != address(0)) {
            require(block.timestamp >= timeLocks[from], "Tokens locked");
        }
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // View function to get all contributors
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    // View function to get contributor count
    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }

    // View function to get contributor info
    function getContributorInfo(address contributor) external view returns (
        uint256 contribution,
        uint256 tokenAllocation,
        bool isWhitelisted
    ) {
        return (
            contributions[contributor],
            presaleContributorTokens[contributor],
            whitelist[contributor]
        );
    }

    // User tracking functions
    function _addUser(address user) internal {
        if (!isUser[user]) {
            isUser[user] = true;
            users.push(user);
            userCount++;
        }
    }

    function getUsers() external view returns (address[] memory) {
        return users;
    }

    function getUserCount() external view returns (uint256) {
        return userCount;
    }

    // Override transfer functions to track users
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._transfer(from, to, amount);
        _addUser(to);
    }

    // Function to participate in presale
    function participateInPresale() external payable nonReentrant {
        require(block.timestamp >= presaleInfo.startTime, "Presale has not started");
        require(block.timestamp <= presaleInfo.endTime, "Presale has ended");
        require(!presaleInfo.finalized, "Presale is finalized");
        require(msg.value >= presaleInfo.minContribution, "Below min contribution");
        require(msg.value <= presaleInfo.maxContribution, "Above max contribution");
        require(presaleInfo.totalContributed + msg.value <= presaleInfo.hardCap, "Hard cap reached");

        uint256 tokensToReceive = msg.value * presaleInfo.presaleRate;
        require(tokensToReceive > 0, "Must receive tokens");

        // Update state
        presaleInfo.totalContributed += msg.value;
        contributions[msg.sender] += msg.value;
        totalPresaleTokensDistributed += tokensToReceive;

        // Transfer tokens
        _transfer(address(this), msg.sender, tokensToReceive);
        
        // Add user to tracking
        _addUser(msg.sender);

        emit PresaleParticipation(msg.sender, msg.value, tokensToReceive);
    }

    // Function to finalize presale and create liquidity pool
    function finalizePresale() external onlyOwner {
        require(block.timestamp > presaleInfo.endTime || 
                presaleInfo.totalContributed >= presaleInfo.hardCap, 
                "Presale not ended");
        require(!presaleInfo.finalized, "Already finalized");
        require(presaleInfo.totalContributed >= presaleInfo.softCap, "Soft cap not reached");

        presaleInfo.finalized = true;

        // TODO: Add liquidity pool creation logic here
        // This will involve:
        // 1. Creating a pair on the DEX
        // 2. Adding liquidity using the collected ETH and locked tokens
        // 3. Locking the LP tokens

        emit PresaleFinalized(presaleInfo.totalContributed, totalPresaleTokensDistributed);
    }

    // Function to claim refund if presale fails
    function claimRefund() external nonReentrant {
        require(block.timestamp > presaleInfo.endTime, "Presale not ended");
        require(!presaleInfo.finalized, "Presale finalized");
        require(presaleInfo.totalContributed < presaleInfo.softCap, "Soft cap reached");

        uint256 contribution = contributions[msg.sender];
        require(contribution > 0, "No contribution");

        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(contribution);

        emit RefundClaimed(msg.sender, contribution);
    }
} 