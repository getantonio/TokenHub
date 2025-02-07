// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title TokenTemplate_v3
 * @notice Template contract for creating new tokens with advanced vesting and distribution features
 */
contract TokenTemplate_v3 is ERC20Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using Math for uint256;

    // Debug events
    event DebugInit(string message, uint256 value);
    event DebugInitString(string message, string value);
    event DebugAllocation(string message, uint256 value);
    event DebugPresale(
        string message,
        uint256 presaleTokens,
        uint256 presaleRate,
        uint256 requiredCap,
        uint256 providedCap
    );
    event DebugInitStep(string step, string message);
    event DebugInitValue(string step, uint256 value);
    event DebugInitAddress(string step, address value);

    struct VestingSchedule {
        string walletName;
        uint256 amount;
        uint256 period;
        address beneficiary;
        uint256 claimed;
        uint256 startTime;
    }

    struct PresaleInfo {
        uint256 softCap;
        uint256 hardCap;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 tokensPerEth;
        uint256 startTime;
        uint256 endTime;
        bool whitelistEnabled;
        bool finalized;
        uint256 totalContributed;
        uint256 totalTokensSold;
    }

    struct PlatformFee {
        address recipient;
        uint256 totalTokens;
        bool vestingEnabled;
        uint256 vestingDuration;
        uint256 cliffDuration;
        uint256 vestingStart;
        uint256 tokensClaimed;
    }

    struct LiquidityInfo {
        uint256 percentage;
        uint256 lockDuration;
        uint256 unlockTime;
        bool locked;
    }

    struct InitParams {
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 maxSupply;
        address owner;
        bool enableBlacklist;
        bool enableTimeLock;
        uint256 tokensPerEth;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 presaleCap;
        uint256 startTime;
        uint256 endTime;
        uint256 liquidityPercentage;
        uint256 liquidityLockDuration;
        address platformFeeRecipient;
        uint256 platformFeeTokens;
        bool platformFeeVestingEnabled;
        uint256 platformFeeVestingDuration;
        uint256 platformFeeCliffDuration;
        uint256 teamPercentage;
        uint256 marketingPercentage;
        uint256 developmentPercentage;
        uint256 presalePercentage;
    }

    // Token configuration
    uint256 public maxSupply;
    bool public blacklistEnabled;
    bool public timeLockEnabled;
    
    // Additional allocation tracking
    uint256 public teamAllocation;
    uint256 public marketingAllocation;
    uint256 public developmentAllocation;
    
    mapping(address => bool) public blacklisted;
    mapping(address => uint256) public timeLocks;

    // Vesting configuration
    VestingSchedule[] public vestingSchedules;
    mapping(uint256 => mapping(address => uint256)) public vestingClaims;

    // Presale configuration
    PresaleInfo public presaleInfo;
    mapping(address => uint256) public contributions;
    mapping(address => bool) public whitelist;

    // Platform fee configuration
    PlatformFee public platformFee;

    // Liquidity configuration
    LiquidityInfo public liquidityInfo;

    // Events
    event TokensVested(address indexed beneficiary, uint256 amount);
    event BlacklistUpdated(address indexed account, bool blacklisted);
    event TimeLockSet(address indexed account, uint256 duration);
    event PresaleContribution(address indexed contributor, uint256 amount);
    event PresaleFinalized(uint256 totalRaised, uint256 totalTokensSold);
    event VestingScheduleAdded(string walletName, address indexed beneficiary, uint256 amount, uint256 period);
    event VestingTokensClaimed(address indexed beneficiary, uint256 scheduleIndex, uint256 amount);
    event LiquidityLocked(uint256 amount, uint256 unlockTime);
    event LiquidityUnlocked(uint256 amount);

    // Modifiers
    modifier notBlacklisted() {
        require(!blacklisted[msg.sender], "Address is blacklisted");
        _;
    }

    modifier checkTimeLock() {
        if (timeLockEnabled) {
            require(block.timestamp >= timeLocks[msg.sender], "Transfer is time-locked");
        }
        _;
    }

    modifier onlyDuringPresale() {
        require(block.timestamp >= presaleInfo.startTime, "Presale not started");
        require(block.timestamp <= presaleInfo.endTime, "Presale ended");
        require(!presaleInfo.finalized, "Presale finalized");
        _;
    }

    /**
     * @notice Initialize the token with all necessary parameters
     */
    function initialize(
        InitParams calldata params
    ) public initializer {
        emit DebugInitStep("Start", "Beginning initialization");
        
        __ERC20_init(params.name, params.symbol);
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        emit DebugInitString("Name", params.name);
        emit DebugInitString("Symbol", params.symbol);
        emit DebugInitValue("Initial Supply", params.initialSupply);
        emit DebugInitValue("Max Supply", params.maxSupply);
        emit DebugInitValue("Presale Rate", params.tokensPerEth);
        emit DebugInitAddress("Owner", params.owner);
        emit DebugInitAddress("Platform Fee Recipient", params.platformFeeRecipient);

        // Supply validation
        emit DebugInitStep("Validation", "Checking supplies");
        require(params.maxSupply >= params.initialSupply, "Max supply must be >= initial supply");
        
        // Presale rate validation
        emit DebugInitStep("Validation", "Checking presale rate");
        require(params.tokensPerEth > 0, "Invalid presale rate");
        
        // Time validation
        emit DebugInitStep("Validation", "Checking times");
        require(params.startTime > block.timestamp, "Start time must be in future");
        require(params.endTime > params.startTime, "End time must be after start time");

        // Calculate presale tokens
        emit DebugInitStep("Calculation", "Computing presale tokens");
        uint256 presaleTokens = (params.initialSupply * params.presalePercentage) / 10000;
        emit DebugInitValue("Presale Tokens", presaleTokens);
        
        // Calculate required presale cap
        emit DebugInitStep("Calculation", "Computing required presale cap");
        uint256 requiredPresaleCap = presaleTokens * (1 ether) / params.tokensPerEth;
        emit DebugInitValue("Required Presale Cap", requiredPresaleCap);
        emit DebugInitValue("Provided Presale Cap", params.presaleCap);
        
        require(params.presaleCap >= requiredPresaleCap, "Presale cap too low for token allocation");

        // Initialize token configuration
        emit DebugInitStep("Configuration", "Setting token parameters");
        maxSupply = params.maxSupply;
        blacklistEnabled = params.enableBlacklist;
        timeLockEnabled = params.enableTimeLock;

        // Initialize presale info
        emit DebugInitStep("Configuration", "Setting presale parameters");
        presaleInfo = PresaleInfo({
            softCap: params.presaleCap / 2,
            hardCap: params.presaleCap,
            minContribution: params.minContribution,
            maxContribution: params.maxContribution,
            tokensPerEth: params.tokensPerEth,
            startTime: params.startTime,
            endTime: params.endTime,
            whitelistEnabled: false,
            finalized: false,
            totalContributed: 0,
            totalTokensSold: 0
        });

        // Initialize liquidity info
        emit DebugInitStep("Configuration", "Setting liquidity parameters");
        liquidityInfo = LiquidityInfo({
            percentage: params.liquidityPercentage,
            lockDuration: params.liquidityLockDuration,
            unlockTime: 0,
            locked: false
        });

        // Initialize platform fee
        emit DebugInitStep("Configuration", "Setting platform fee parameters");
        platformFee = PlatformFee({
            recipient: params.platformFeeRecipient,
            totalTokens: params.platformFeeTokens,
            vestingEnabled: params.platformFeeVestingEnabled,
            vestingDuration: params.platformFeeVestingDuration,
            cliffDuration: params.platformFeeCliffDuration,
            vestingStart: params.startTime,
            tokensClaimed: 0
        });

        // Mint tokens
        emit DebugInitStep("Minting", "Creating initial supply");
        _mint(address(this), params.initialSupply);
        
        // Calculate allocations
        emit DebugInitStep("Calculation", "Computing token allocations");
        teamAllocation = (params.initialSupply * params.teamPercentage) / 10000;
        marketingAllocation = (params.initialSupply * params.marketingPercentage) / 10000;
        developmentAllocation = (params.initialSupply * params.developmentPercentage) / 10000;

        emit DebugInitValue("Team Allocation", teamAllocation);
        emit DebugInitValue("Marketing Allocation", marketingAllocation);
        emit DebugInitValue("Development Allocation", developmentAllocation);

        // Create vesting schedules
        emit DebugInitStep("Configuration", "Setting up vesting schedules");
        
        if (teamAllocation > 0) {
            vestingSchedules.push(VestingSchedule({
                walletName: "Team",
                amount: teamAllocation,
                period: 365,
                beneficiary: params.owner,
                claimed: 0,
                startTime: params.startTime
            }));
        }

        if (marketingAllocation > 0) {
            vestingSchedules.push(VestingSchedule({
                walletName: "Marketing",
                amount: marketingAllocation,
                period: 180,
                beneficiary: params.owner,
                claimed: 0,
                startTime: params.startTime
            }));
        }

        if (developmentAllocation > 0) {
            vestingSchedules.push(VestingSchedule({
                walletName: "Development",
                amount: developmentAllocation,
                period: 365,
                beneficiary: params.owner,
                claimed: 0,
                startTime: params.startTime
            }));
        }
        
        emit DebugInitStep("Finalization", "Transferring ownership");
        _transferOwnership(params.owner);
        
        emit DebugInitStep("Complete", "Initialization finished");
    }

    // Vesting functions
    function addVestingSchedule(
        string memory walletName,
        uint256 amount,
        uint256 period,
        address beneficiary
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(period > 0, "Period must be > 0");

        vestingSchedules.push(VestingSchedule({
            walletName: walletName,
            amount: amount,
            period: period,
            beneficiary: beneficiary,
            claimed: 0,
            startTime: block.timestamp
        }));

        emit VestingScheduleAdded(walletName, beneficiary, amount, period);
    }

    function claimVestedTokens(uint256 scheduleIndex) external nonReentrant {
        require(scheduleIndex < vestingSchedules.length, "Invalid schedule index");
        VestingSchedule storage schedule = vestingSchedules[scheduleIndex];
        require(msg.sender == schedule.beneficiary, "Not beneficiary");

        uint256 claimable = getClaimableAmount(scheduleIndex);
        require(claimable > 0, "No tokens claimable");

        schedule.claimed += claimable;
        _transfer(address(this), msg.sender, claimable);

        emit VestingTokensClaimed(msg.sender, scheduleIndex, claimable);
    }

    function getClaimableAmount(uint256 scheduleIndex) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[scheduleIndex];
        if (block.timestamp < schedule.startTime) return 0;

        uint256 timeElapsed = block.timestamp - schedule.startTime;
        uint256 totalVestingDuration = schedule.period * 1 days;
        
        if (timeElapsed >= totalVestingDuration) {
            return schedule.amount - schedule.claimed;
        }

        uint256 vestedAmount = (schedule.amount * timeElapsed) / totalVestingDuration;
        return vestedAmount - schedule.claimed;
    }

    // Presale functions
    function contribute() external payable onlyDuringPresale notBlacklisted nonReentrant {
        require(msg.value >= presaleInfo.minContribution, "Below min contribution");
        require(msg.value <= presaleInfo.maxContribution, "Above max contribution");
        require(presaleInfo.totalContributed + msg.value <= presaleInfo.hardCap, "Hard cap reached");
        
        if (presaleInfo.whitelistEnabled) {
            require(whitelist[msg.sender], "Not whitelisted");
        }

        // Direct calculation of tokens based on contribution
        uint256 tokenAmount = msg.value * presaleInfo.tokensPerEth;
        emit DebugPresale(
            "Calculating contribution tokens",
            tokenAmount,
            presaleInfo.tokensPerEth,
            msg.value,
            presaleInfo.hardCap
        );

        require(tokenAmount > 0, "Invalid token amount");
        require(presaleInfo.totalTokensSold + tokenAmount <= balanceOf(address(this)), "Insufficient tokens");

        contributions[msg.sender] += msg.value;
        require(contributions[msg.sender] <= presaleInfo.maxContribution, "Max contribution exceeded");

        presaleInfo.totalContributed += msg.value;
        presaleInfo.totalTokensSold += tokenAmount;

        emit PresaleContribution(msg.sender, msg.value);
    }

    function finalizePresale() external onlyOwner {
        require(block.timestamp > presaleInfo.endTime || presaleInfo.totalContributed >= presaleInfo.hardCap, "Cannot finalize yet");
        require(!presaleInfo.finalized, "Already finalized");
        require(presaleInfo.totalContributed >= presaleInfo.softCap, "Soft cap not reached");

        presaleInfo.finalized = true;
        
        // Handle liquidity locking
        if (liquidityInfo.percentage > 0) {
            uint256 liquidityTokens = (presaleInfo.totalTokensSold * liquidityInfo.percentage) / 100;
            liquidityInfo.unlockTime = block.timestamp + (liquidityInfo.lockDuration * 1 days);
            liquidityInfo.locked = true;
            emit LiquidityLocked(liquidityTokens, liquidityInfo.unlockTime);
        }

        emit PresaleFinalized(presaleInfo.totalContributed, presaleInfo.totalTokensSold);
    }

    // Platform fee functions
    function claimPlatformFeeTokens() external nonReentrant {
        require(msg.sender == platformFee.recipient, "Not fee recipient");
        require(platformFee.tokensClaimed < platformFee.totalTokens, "All tokens claimed");

        uint256 claimable;
        if (platformFee.vestingEnabled) {
            require(block.timestamp >= platformFee.vestingStart + platformFee.cliffDuration, "Cliff period not ended");
            
            uint256 timeElapsed = block.timestamp - platformFee.vestingStart;
            if (timeElapsed >= platformFee.vestingDuration) {
                claimable = platformFee.totalTokens - platformFee.tokensClaimed;
            } else {
                claimable = (platformFee.totalTokens * timeElapsed) / platformFee.vestingDuration - platformFee.tokensClaimed;
            }
        } else {
            claimable = platformFee.totalTokens - platformFee.tokensClaimed;
        }

        require(claimable > 0, "No tokens claimable");
        platformFee.tokensClaimed += claimable;
        _transfer(address(this), msg.sender, claimable);
    }

    // Admin functions
    function setBlacklist(address account, bool isBlacklisted) external onlyOwner {
        require(blacklistEnabled, "Blacklist not enabled");
        blacklisted[account] = isBlacklisted;
        emit BlacklistUpdated(account, isBlacklisted);
    }

    function setTimeLock(address account, uint256 duration) external onlyOwner {
        require(timeLockEnabled, "Time lock not enabled");
        timeLocks[account] = block.timestamp + duration;
        emit TimeLockSet(account, duration);
    }

    function setWhitelistStatus(address account, bool status) external onlyOwner {
        whitelist[account] = status;
    }

    function withdrawPresaleFunds() external onlyOwner {
        require(presaleInfo.finalized, "Presale not finalized");
        require(address(this).balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    // Override transfer functions to check blacklist and time lock
    function transfer(address to, uint256 amount) public override notBlacklisted checkTimeLock returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override notBlacklisted checkTimeLock returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    // Required by UUPSUpgradeable
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // View functions
    function getVestingSchedulesCount() external view returns (uint256) {
        return vestingSchedules.length;
    }

    function getVestingSchedule(uint256 index) external view returns (
        string memory walletName,
        uint256 amount,
        uint256 period,
        address beneficiary,
        uint256 claimed,
        uint256 startTime
    ) {
        require(index < vestingSchedules.length, "Invalid index");
        VestingSchedule memory schedule = vestingSchedules[index];
        return (
            schedule.walletName,
            schedule.amount,
            schedule.period,
            schedule.beneficiary,
            schedule.claimed,
            schedule.startTime
        );
    }
} 