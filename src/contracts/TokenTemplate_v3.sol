// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract TokenTemplate_v3 is 
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    Ownable,
    ReentrancyGuard
{
    uint256 public maxSupply;
    bool public blacklistEnabled;
    bool public timeLockEnabled;
    
    // Presale configuration
    uint256 public presaleRate;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public minContribution;
    uint256 public maxContribution;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public presalePercentage;
    uint256 public liquidityPercentage;
    uint256 public liquidityLockDuration;
    uint256 public maxActivePresales;
    bool public presaleEnabled;
    
    // Optimized vesting structure
    struct VestingInfo {
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 duration;
        uint256 cliff;
    }
    
    // Single mapping for vesting info instead of multiple mappings
    mapping(address => VestingInfo) private vestingInfo;
    
    struct WalletAllocation {
        address wallet;
        uint256 percentage;
        bool vestingEnabled;
        uint256 vestingDuration;
        uint256 cliffDuration;
        uint256 vestingStartTime;
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
        uint256 softCap;
        uint256 hardCap;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 startTime;
        uint256 endTime;
        uint256 presalePercentage;
        uint256 liquidityPercentage;
        uint256 liquidityLockDuration;
        WalletAllocation[] walletAllocations;
        uint256 maxActivePresales;
        bool presaleEnabled;
    }
    
    // Blacklist and timelock
    mapping(address => bool) private _blacklist;
    mapping(address => uint256) private _lockTime;
    
    // Events
    event BlacklistUpdated(address indexed account, bool status);
    event TimeLockSet(address indexed account, uint256 timestamp);
    event TokensClaimed(address indexed wallet, uint256 amount);
    event PresaleStarted(uint256 startTime, uint256 endTime);
    event PresaleEnded(uint256 totalRaised);
    event LiquidityAdded(address indexed pair, uint256 tokensAdded, uint256 ethAdded);
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliff
    );
    event Paused();
    event Unpaused();

    IUniswapV2Router02 public immutable uniswapV2Router;
    address public uniswapV2Pair;
    
    string private tokenName;
    string private tokenSymbol;
    
    uint256 public liquidityAllocation;
    uint256 public remainingLiquidityAllocation;
    
    constructor(address _router) ERC20("", "") {
        require(_router != address(0), "Invalid router address");
        
        // Initialize router
        uniswapV2Router = IUniswapV2Router02(_router);
    }

    function initialize(
        InitParams calldata params
    ) external payable {
        require(totalSupply() == 0, "Already initialized");

        tokenName = params.name;
        tokenSymbol = params.symbol;
        
        maxSupply = params.maxSupply;
        blacklistEnabled = params.enableBlacklist;
        timeLockEnabled = params.enableTimeLock;
        
        presaleRate = params.presaleRate;
        softCap = params.softCap;
        hardCap = params.hardCap;
        minContribution = params.minContribution;
        maxContribution = params.maxContribution;
        startTime = params.startTime;
        endTime = params.endTime;
        presalePercentage = params.presalePercentage;
        liquidityPercentage = params.liquidityPercentage;
        liquidityLockDuration = params.liquidityLockDuration;
        maxActivePresales = params.maxActivePresales;
        presaleEnabled = params.presaleEnabled;
        
        uint256 totalTokensNeeded = params.initialSupply;
        _mint(address(this), totalTokensNeeded);
        
        uint256 remainingTokens = totalTokensNeeded;
        uint256 allocatedTokens = 0;
        
        if (presaleEnabled) {
            uint256 presaleTokens = (totalTokensNeeded * params.presalePercentage) / 100;
            allocatedTokens += presaleTokens;
            remainingTokens -= presaleTokens;
        }
        
        liquidityAllocation = (totalTokensNeeded * params.liquidityPercentage) / 100;
        remainingLiquidityAllocation = liquidityAllocation;
        allocatedTokens += liquidityAllocation;
        remainingTokens -= liquidityAllocation;
        
        // Optimized wallet allocation handling
        if (params.walletAllocations.length > 0) {
            for (uint256 i = 0; i < params.walletAllocations.length; i++) {
                uint256 walletTokens = (totalTokensNeeded * params.walletAllocations[i].percentage) / 100;
                allocatedTokens += walletTokens;
                
                require(allocatedTokens <= totalTokensNeeded, "Total allocation exceeds initial supply");
                require(params.walletAllocations[i].wallet != address(0), "Invalid wallet address");
                
                if (params.walletAllocations[i].vestingEnabled) {
                    // Create vesting schedule
                    vestingInfo[params.walletAllocations[i].wallet] = VestingInfo({
                        totalAmount: walletTokens,
                        claimedAmount: 0,
                        startTime: params.walletAllocations[i].vestingStartTime,
                        duration: params.walletAllocations[i].vestingDuration,
                        cliff: params.walletAllocations[i].cliffDuration
                    });
                    
                    emit VestingScheduleCreated(
                        params.walletAllocations[i].wallet,
                        walletTokens,
                        params.walletAllocations[i].vestingStartTime,
                        params.walletAllocations[i].vestingDuration,
                        params.walletAllocations[i].cliffDuration
                    );
                } else {
                    // Explicitly cast to address to ensure compatibility across networks
                    address recipient = address(params.walletAllocations[i].wallet);
                    require(recipient != address(0), "Zero address recipient");
                    _transfer(address(this), recipient, walletTokens);
                    // Add redundancy log for debugging
                    emit TokensClaimed(recipient, walletTokens);
                }
            }
        }
        
        require(allocatedTokens == totalTokensNeeded, "Total allocation must equal initial supply");
        
        _transferOwnership(params.owner);
    }

    function name() public view virtual override returns (string memory) {
        return tokenName;
    }

    function symbol() public view virtual override returns (string memory) {
        return tokenSymbol;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, value);
        
        if (blacklistEnabled) {
            require(!_blacklist[from] && !_blacklist[to], "Address is blacklisted");
        }
        if (timeLockEnabled) {
            require(block.timestamp >= _lockTime[from], "Tokens are time-locked");
        }
    }

    // Optimized vesting claim function
    function claimVestedTokens() external nonReentrant {
        VestingInfo storage vesting = vestingInfo[msg.sender];
        require(vesting.totalAmount > 0, "No vesting schedule");
        require(block.timestamp >= vesting.startTime + vesting.cliff, "Cliff period not ended");
        
        uint256 timeSinceStart = block.timestamp - vesting.startTime;
        uint256 claimableAmount;
        
        if (timeSinceStart >= vesting.duration) {
            claimableAmount = vesting.totalAmount - vesting.claimedAmount;
        } else {
            claimableAmount = (vesting.totalAmount * timeSinceStart / vesting.duration) - vesting.claimedAmount;
        }
        
        require(claimableAmount > 0, "No tokens available to claim");
        
        vesting.claimedAmount += claimableAmount;
        _transfer(address(this), msg.sender, claimableAmount);
        
        emit TokensClaimed(msg.sender, claimableAmount);
    }

    // View functions for vesting info
    function getVestingInfo(address wallet) external view returns (
        uint256 totalAmount,
        uint256 claimedAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliff
    ) {
        VestingInfo memory vesting = vestingInfo[wallet];
        return (
            vesting.totalAmount,
            vesting.claimedAmount,
            vesting.startTime,
            vesting.duration,
            vesting.cliff
        );
    }

    function getClaimableAmount(address wallet) external view returns (uint256) {
        VestingInfo memory vesting = vestingInfo[wallet];
        if (vesting.totalAmount == 0 || block.timestamp < vesting.startTime + vesting.cliff) {
            return 0;
        }
        
        uint256 timeSinceStart = block.timestamp - vesting.startTime;
        if (timeSinceStart >= vesting.duration) {
            return vesting.totalAmount - vesting.claimedAmount;
        }
        
        return (vesting.totalAmount * timeSinceStart / vesting.duration) - vesting.claimedAmount;
    }

    // Blacklist management
    function setBlacklist(address account, bool status) external onlyOwner {
        require(blacklistEnabled, "Blacklist is not enabled");
        _blacklist[account] = status;
        emit BlacklistUpdated(account, status);
    }

    // Time lock management
    function setTimeLock(address account, uint256 unlockTime) external onlyOwner {
        require(timeLockEnabled, "Time lock is not enabled");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        _lockTime[account] = unlockTime;
        emit TimeLockSet(account, unlockTime);
    }

    function isBlacklisted(address account) external view returns (bool) {
        return blacklistEnabled && _blacklist[account];
    }

    function getUnlockTime(address account) external view returns (uint256) {
        return timeLockEnabled ? _lockTime[account] : 0;
    }

    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) internal {
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            owner(),
            block.timestamp + 300
        );
    }

    function addLiquidity(uint256 tokenAmount) external payable {
        require(msg.value > 0, "Must send ETH");
        require(tokenAmount > 0, "Must provide tokens");
        
        _transfer(msg.sender, address(this), tokenAmount);
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        uniswapV2Router.addLiquidityETH{value: msg.value}(
            address(this),
            tokenAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );
    }

    function addLiquidityFromContract(uint256 tokenAmount) external payable onlyOwner {
        require(msg.value > 0, "Must send ETH");
        require(tokenAmount > 0, "Must provide tokens");
        require(tokenAmount <= remainingLiquidityAllocation, "Amount exceeds remaining liquidity allocation");
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient contract balance");
        
        // Create pair if it doesn't exist yet
        if (uniswapV2Pair == address(0)) {
            uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory())
                .createPair(address(this), uniswapV2Router.WETH());
        }
        
        remainingLiquidityAllocation -= tokenAmount;
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        uniswapV2Router.addLiquidityETH{value: msg.value}(
            address(this),
            tokenAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        emit LiquidityAdded(uniswapV2Pair, tokenAmount, msg.value);
    }

    function getRemainingLiquidityAllocation() external view returns (uint256) {
        return remainingLiquidityAllocation;
    }
} 