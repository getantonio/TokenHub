// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BaseToken is ERC20, Pausable, Ownable, ReentrancyGuard {
    // Token parameters
    uint256 public maxSupply;
    uint256 public tokenPrice;
    bool public transfersEnabled;
    
    // Anti-bot and security
    mapping(address => bool) public blacklisted;
    uint256 public maxTransferAmount;
    uint256 public cooldownTime;
    mapping(address => uint256) public lastTransferTime;
    
    // Enhanced anti-bot protection
    bool public antiBotEnabled;
    uint256 public launchTime;
    uint256 public constant ANTI_BOT_DURATION = 5 minutes;
    uint256 public constant MAX_WALLET_PERCENT = 2; // 2% max wallet size during anti-bot period
    mapping(address => bool) public whitelisted;
    
    // Trading limits
    mapping(address => uint256) public dailyTransferLimit;
    mapping(address => uint256) public lastDayReset;
    
    // Vesting contracts
    mapping(address => bool) public isVestingContract;

    // Token locking mechanism
    struct Lock {
        uint256 amount;
        uint256 unlockTime;
    }
    mapping(address => Lock) public lockedTokens;
    
    // Buyback and burn configuration
    uint256 public buybackFee;
    uint256 public burnFee;
    address public constant DEAD_WALLET = 0x000000000000000000000000000000000000dEaD;
    uint256 public autoBurnThreshold;
    uint256 public buybackThreshold;
    mapping(address => bool) public excludedFromFees;
    
    // Fee collection
    uint256 public collectedBuybackFee;
    uint256 public collectedBurnFee;
    
    // Reward distribution
    uint256 public rewardFee;
    uint256 public rewardThreshold;
    uint256 public collectedRewardFee;
    mapping(address => uint256) public lastRewardClaim;
    mapping(address => uint256) public rewardPoints;
    uint256 public totalRewardPoints;
    uint256 public rewardCooldown;
    
    // Governance
    struct Proposal {
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        mapping(address => bool) hasVoted;
        bytes callData;
        address target;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant PROPOSAL_THRESHOLD = 100000 * 10**18; // 100,000 tokens
    
    // Emergency recovery
    bool public emergencyMode;
    mapping(address => bool) public emergencyAdmins;
    uint256 public constant EMERGENCY_COOLDOWN = 7 days;
    uint256 public lastEmergencyAction;
    
    // Events
    event AntiBotEnabled(bool enabled);
    event WhitelistUpdated(address indexed account, bool status);
    event DailyLimitUpdated(address indexed account, uint256 limit);
    event VestingContractAdded(address indexed vestingContract);
    event VestingContractRemoved(address indexed vestingContract);
    event TokensLocked(address indexed account, uint256 amount, uint256 unlockTime);
    event TokensUnlocked(address indexed account, uint256 amount);
    event TokensBurned(uint256 amount);
    event BuybackExecuted(uint256 amount);
    event FeesUpdated(uint256 buybackFee, uint256 burnFee);
    event FeeExclusionUpdated(address account, bool excluded);
    event RewardDistributed(address indexed recipient, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, address proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId);
    event EmergencyModeEnabled(address indexed enabler);
    event EmergencyModeDisabled(address indexed disabler);
    event EmergencyAdminUpdated(address indexed admin, bool status);
    event EmergencyRecovery(address indexed token, address indexed recipient, uint256 amount);

    modifier onlyEmergencyAdmin() {
        require(emergencyAdmins[msg.sender] || msg.sender == owner(), "Not emergency admin");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        uint256 _initialSupply,
        uint256 _tokenPrice
    ) ERC20(name, symbol) {
        require(_initialSupply <= _maxSupply, "Initial supply exceeds max supply");
        maxSupply = _maxSupply;
        tokenPrice = _tokenPrice;
        transfersEnabled = true;
        _mint(msg.sender, _initialSupply);
        buybackFee = 100; // 1%
        burnFee = 100; // 1%
        autoBurnThreshold = _initialSupply / 1000; // 0.1% of initial supply
        buybackThreshold = _initialSupply / 1000; // 0.1% of initial supply
        rewardFee = 100; // 1%
        rewardThreshold = _initialSupply / 1000; // 0.1% of initial supply
        rewardCooldown = 1 days;
        
        // Exclude owner and this contract from fees
        excludedFromFees[msg.sender] = true;
        excludedFromFees[address(this)] = true;
        emergencyAdmins[msg.sender] = true;
        lastEmergencyAction = block.timestamp;
    }

    // Anti-bot functions
    function setAntiBot(bool _enabled) external onlyOwner {
        antiBotEnabled = _enabled;
        if (_enabled) {
            launchTime = block.timestamp;
        }
        emit AntiBotEnabled(_enabled);
    }
    
    function updateWhitelist(address account, bool status) external onlyOwner {
        whitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    function setDailyLimit(address account, uint256 limit) external onlyOwner {
        dailyTransferLimit[account] = limit;
        emit DailyLimitUpdated(account, limit);
    }

    // Existing security functions
    function setTransfersEnabled(bool _enabled) external onlyOwner {
        transfersEnabled = _enabled;
    }

    function blacklistAddress(address account, bool status) external onlyOwner {
        blacklisted[account] = status;
    }

    function setMaxTransferAmount(uint256 amount) external onlyOwner {
        maxTransferAmount = amount;
    }

    function setCooldownTime(uint256 time) external onlyOwner {
        cooldownTime = time;
    }

    // Vesting contract management
    function addVestingContract(address vestingContract) external onlyOwner {
        require(vestingContract != address(0), "Invalid vesting contract address");
        isVestingContract[vestingContract] = true;
        emit VestingContractAdded(vestingContract);
    }

    function removeVestingContract(address vestingContract) external onlyOwner {
        isVestingContract[vestingContract] = false;
        emit VestingContractRemoved(vestingContract);
    }

    function lockTokens(address account, uint256 amount, uint256 lockDuration) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(lockDuration > 0, "Duration must be greater than 0");
        require(balanceOf(account) >= amount, "Insufficient balance");
        
        uint256 unlockTime = block.timestamp + lockDuration;
        lockedTokens[account] = Lock(amount, unlockTime);
        
        emit TokensLocked(account, amount, unlockTime);
    }
    
    function unlockTokens(address account) external {
        Lock storage lock = lockedTokens[account];
        require(lock.amount > 0, "No tokens locked");
        require(block.timestamp >= lock.unlockTime, "Tokens are still locked");
        
        uint256 amount = lock.amount;
        delete lockedTokens[account];
        
        emit TokensUnlocked(account, amount);
    }

    // Fee configuration functions
    function setFees(uint256 _buybackFee, uint256 _burnFee) external onlyOwner {
        require(_buybackFee <= 500 && _burnFee <= 500, "Fees cannot exceed 5%");
        buybackFee = _buybackFee;
        burnFee = _burnFee;
        emit FeesUpdated(_buybackFee, _burnFee);
    }
    
    function setFeeExclusion(address account, bool excluded) external onlyOwner {
        excludedFromFees[account] = excluded;
        emit FeeExclusionUpdated(account, excluded);
    }
    
    function setAutoBurnThreshold(uint256 threshold) external onlyOwner {
        autoBurnThreshold = threshold;
    }
    
    function setBuybackThreshold(uint256 threshold) external onlyOwner {
        buybackThreshold = threshold;
    }

    // Reward distribution functions
    function setRewardFee(uint256 _rewardFee) external onlyOwner {
        require(_rewardFee <= 500, "Fee cannot exceed 5%");
        rewardFee = _rewardFee;
    }
    
    function claimRewards() external nonReentrant {
        require(block.timestamp >= lastRewardClaim[msg.sender] + rewardCooldown, "Cooldown active");
        require(rewardPoints[msg.sender] > 0, "No rewards available");
        
        uint256 share = (rewardPoints[msg.sender] * collectedRewardFee) / totalRewardPoints;
        require(share > 0, "Reward too small");
        
        rewardPoints[msg.sender] = 0;
        totalRewardPoints -= rewardPoints[msg.sender];
        collectedRewardFee -= share;
        lastRewardClaim[msg.sender] = block.timestamp;
        
        _transfer(address(this), msg.sender, share);
        emit RewardDistributed(msg.sender, share);
    }

    // Governance functions
    function propose(
        address target,
        string calldata description,
        bytes calldata callData
    ) external returns (uint256) {
        require(balanceOf(msg.sender) >= PROPOSAL_THRESHOLD, "Insufficient tokens to propose");
        
        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        proposal.description = description;
        proposal.startTime = block.timestamp + VOTING_DELAY;
        proposal.endTime = proposal.startTime + VOTING_PERIOD;
        proposal.callData = callData;
        proposal.target = target;
        
        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }
    
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votes = balanceOf(msg.sender);
        require(votes > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
        
        emit VoteCast(proposalId, msg.sender, support, votes);
    }
    
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal failed");
        
        proposal.executed = true;
        
        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Proposal execution failed");
        
        emit ProposalExecuted(proposalId);
    }

    // Burning functions
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(amount);
    }
    
    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "Burn amount exceeds allowance");
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
        emit TokensBurned(amount);
    }
    
    // Automatic buyback and burn
    function executeBuyback() external onlyOwner {
        require(collectedBuybackFee >= buybackThreshold, "Insufficient buyback fees");
        uint256 amount = collectedBuybackFee;
        collectedBuybackFee = 0;
        // Implementation would interact with DEX to buy tokens
        emit BuybackExecuted(amount);
    }
    
    function executeAutoBurn() external {
        require(collectedBurnFee >= autoBurnThreshold, "Insufficient burn fees");
        uint256 amount = collectedBurnFee;
        collectedBurnFee = 0;
        _burn(address(this), amount);
        emit TokensBurned(amount);
    }

    // Emergency functions
    function setEmergencyAdmin(address admin, bool status) external onlyOwner {
        emergencyAdmins[admin] = status;
        emit EmergencyAdminUpdated(admin, status);
    }
    
    function enableEmergencyMode() external onlyEmergencyAdmin {
        require(!emergencyMode, "Emergency mode already enabled");
        require(block.timestamp >= lastEmergencyAction + EMERGENCY_COOLDOWN, "Emergency cooldown active");
        
        emergencyMode = true;
        lastEmergencyAction = block.timestamp;
        
        // Pause all transfers
        _pause();
        
        emit EmergencyModeEnabled(msg.sender);
    }
    
    function disableEmergencyMode() external onlyOwner {
        require(emergencyMode, "Emergency mode not enabled");
        
        emergencyMode = false;
        
        // Resume transfers
        _unpause();
        
        emit EmergencyModeDisabled(msg.sender);
    }
    
    // Token recovery functions
    function recoverERC20(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) external onlyEmergencyAdmin {
        require(emergencyMode, "Emergency mode not enabled");
        require(tokenAddress != address(this), "Cannot recover base token");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(recipient, amount), "Token recovery failed");
        
        emit EmergencyRecovery(tokenAddress, recipient, amount);
    }
    
    function recoverETH(address payable recipient) external onlyEmergencyAdmin {
        require(emergencyMode, "Emergency mode not enabled");
        
        uint256 balance = address(this).balance;
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "ETH recovery failed");
        
        emit EmergencyRecovery(address(0), recipient, balance);
    }

    // Override transfer function with enhanced security checks
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        require(!emergencyMode || emergencyAdmins[sender], "Transfers disabled in emergency mode");
        require(transfersEnabled, "Transfers are disabled");
        require(!blacklisted[sender] && !blacklisted[recipient], "Address is blacklisted");
        
        // Check locked tokens
        Lock storage lock = lockedTokens[sender];
        if (lock.amount > 0) {
            if (block.timestamp < lock.unlockTime) {
                require(
                    balanceOf(sender) - amount >= lock.amount,
                    "Transfer would unlock locked tokens"
                );
            }
        }
        
        // Skip restrictions for whitelisted addresses and vesting contracts
        if (!whitelisted[sender] && !whitelisted[recipient] && 
            !isVestingContract[sender] && !isVestingContract[recipient]) {
            
            // Anti-bot checks during launch period
            if (antiBotEnabled && block.timestamp < launchTime + ANTI_BOT_DURATION) {
                require(amount <= (totalSupply() * MAX_WALLET_PERCENT) / 100, "Transfer exceeds max wallet size");
                require(balanceOf(recipient) + amount <= (totalSupply() * MAX_WALLET_PERCENT) / 100, 
                        "Recipient would exceed max wallet size");
            }
            
            // Daily transfer limit check
            if (dailyTransferLimit[sender] > 0) {
                uint256 currentDay = block.timestamp / 1 days;
                if (currentDay > lastDayReset[sender]) {
                    lastDayReset[sender] = currentDay;
                }
                require(amount <= dailyTransferLimit[sender], "Exceeds daily transfer limit");
            }
            
            // Regular transfer restrictions
            require(amount <= maxTransferAmount || maxTransferAmount == 0, "Transfer amount exceeds limit");
            
            if (cooldownTime > 0) {
                require(
                    lastTransferTime[sender] + cooldownTime <= block.timestamp,
                    "Transfer cooldown active"
                );
                lastTransferTime[sender] = block.timestamp;
            }
        }

        // Calculate and apply fees if neither address is excluded
        if (!excludedFromFees[sender] && !excludedFromFees[recipient]) {
            uint256 buybackAmount = (amount * buybackFee) / 10000;
            uint256 burnAmount = (amount * burnFee) / 10000;
            uint256 totalFees = buybackAmount + burnAmount;
            
            if (totalFees > 0) {
                super._transfer(sender, address(this), totalFees);
                amount -= totalFees;
                
                collectedBuybackFee += buybackAmount;
                collectedBurnFee += burnAmount;
                
                // Auto-execute burn if threshold reached
                if (collectedBurnFee >= autoBurnThreshold) {
                    executeAutoBurn();
                }
            }
        }

        // Calculate and apply reward fee
        if (!excludedFromFees[sender] && !excludedFromFees[recipient]) {
            uint256 rewardAmount = (amount * rewardFee) / 10000;
            
            if (rewardAmount > 0) {
                super._transfer(sender, address(this), rewardAmount);
                amount -= rewardAmount;
                
                collectedRewardFee += rewardAmount;
                rewardPoints[recipient] += amount;
                totalRewardPoints += amount;
            }
        }

        super._transfer(sender, recipient, amount);
    }

    // Pause/Unpause functionality
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Override receive function to accept ETH
    receive() external payable {}
} 