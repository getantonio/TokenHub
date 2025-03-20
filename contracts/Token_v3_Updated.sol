// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./ITokenTypes.sol";

// Import TokenFactory interface
interface ITokenFactory_v3_Updated {
    function routerAddress() external view returns (address);
}

contract Token_v3_Updated is 
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

    IUniswapV2Router02 public immutable uniswapV2Router;
    address public uniswapV2Pair;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _maxSupply,
        address owner,
        bool enableBlacklist,
        bool enableTimeLock,
        bool _presaleEnabled,
        uint256 _maxActivePresales
    ) ERC20(name, symbol) {
        maxSupply = _maxSupply;
        blacklistEnabled = enableBlacklist;
        timeLockEnabled = enableTimeLock;
        presaleEnabled = _presaleEnabled;
        maxActivePresales = _maxActivePresales;
        
        _mint(address(this), initialSupply);
        _transferOwnership(owner);
        
        // Get router address from TokenFactory for BSC compatibility
        ITokenFactory_v3_Updated factory = ITokenFactory_v3_Updated(msg.sender);
        address routerAddress = factory.routerAddress();
        require(routerAddress != address(0), "Invalid router address");
        
        // Use router from factory
        uniswapV2Router = IUniswapV2Router02(routerAddress);
    }

    function configurePresale(
        uint256 _presaleRate,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner {
        require(presaleEnabled, "Presale not enabled");
        
        presaleRate = _presaleRate;
        softCap = _softCap;
        hardCap = _hardCap;
        minContribution = _minContribution;
        maxContribution = _maxContribution;
        startTime = _startTime;
        endTime = _endTime;
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
    
    // New function to add liquidity from contract tokens
    function addLiquidityFromContractTokens() external payable onlyOwner {
        require(msg.value > 0, "Must send ETH for liquidity");
        require(balanceOf(address(this)) > 0, "No tokens in contract");
        
        // Calculate token amount based on contract balance
        uint256 tokenAmount = balanceOf(address(this));
        
        // Add liquidity with the provided ETH and tokens from contract
        addLiquidity(tokenAmount, msg.value);
        
        // Create pair if it doesn't exist yet
        if (uniswapV2Pair == address(0)) {
            uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory())
                .getPair(address(this), uniswapV2Router.WETH());
        }
        
        emit LiquidityAdded(uniswapV2Pair, tokenAmount, msg.value);
    }

    // Add function to get remaining liquidity allocation
    function getRemainingLiquidityAllocation() external view returns (uint256) {
        return balanceOf(address(this));
    }
    
    // Modify configureDistribution to add liquidity if ETH is provided
    function configureDistribution(
        uint256 _presalePercentage,
        uint256 _liquidityPercentage,
        uint256 _liquidityLockDuration,
        ITokenTypes.WalletAllocation[] memory walletAllocations
    ) external payable onlyOwner {
        presalePercentage = _presalePercentage;
        liquidityPercentage = _liquidityPercentage;
        liquidityLockDuration = _liquidityLockDuration;
        
        uint256 totalSupply = totalSupply();
        uint256 allocatedTokens = 0;
        
        if (presaleEnabled) {
            uint256 presaleTokens = (totalSupply * presalePercentage) / 100;
            allocatedTokens += presaleTokens;
        }
        
        uint256 liquidityTokens = (totalSupply * liquidityPercentage) / 100;
        allocatedTokens += liquidityTokens;
        
        // Accept empty allocations only if the other percentages add up to 100%
        if (walletAllocations.length == 0 && (_presalePercentage + _liquidityPercentage == 100)) {
            return;
        }
        
        // Explicitly require at least one wallet allocation
        require(walletAllocations.length > 0, "Must provide at least one wallet allocation");
        
        for (uint256 i = 0; i < walletAllocations.length; i++) {
            require(walletAllocations[i].wallet != address(0), "Invalid wallet address");
            require(walletAllocations[i].percentage > 0, "Percentage must be > 0");
            
            uint256 walletTokens = (totalSupply * walletAllocations[i].percentage) / 100;
            allocatedTokens += walletTokens;
            
            // POLYGON AMOY/BSC FIX - Force direct transfer for all wallets except those explicitly requesting vesting
            // This ensures tokens always go to wallets rather than staying in contract
            bool shouldVest = walletAllocations[i].vestingEnabled && 
                             walletAllocations[i].vestingDuration > 0 && 
                             walletAllocations[i].vestingStartTime > block.timestamp;
            
            if (shouldVest) {
                // Create vesting schedule
                vestingInfo[walletAllocations[i].wallet] = VestingInfo({
                    totalAmount: walletTokens,
                    claimedAmount: 0,
                    startTime: walletAllocations[i].vestingStartTime,
                    duration: walletAllocations[i].vestingDuration,
                    cliff: walletAllocations[i].cliffDuration
                });
                
                emit VestingScheduleCreated(
                    walletAllocations[i].wallet,
                    walletTokens,
                    walletAllocations[i].vestingStartTime,
                    walletAllocations[i].vestingDuration,
                    walletAllocations[i].cliffDuration
                );
            } else {
                // Explicitly cast to address to ensure compatibility across networks
                address recipient = address(walletAllocations[i].wallet);
                require(recipient != address(0), "Zero address recipient");
                
                // Force direct transfer with additional safety
                uint256 preBalance = balanceOf(recipient);
                _transfer(address(this), recipient, walletTokens);
                uint256 postBalance = balanceOf(recipient);
                
                // Verify transfer succeeded
                require(postBalance > preBalance, "Transfer failed");
                
                // Add redundancy log for debugging
                emit TokensClaimed(recipient, walletTokens);
            }
        }
        
        require(allocatedTokens == totalSupply, "Total allocation must equal supply");
        
        // Add liquidity if ETH is provided
        if (msg.value > 0 && liquidityTokens > 0) {
            addLiquidity(liquidityTokens, msg.value);
            
            // Create pair if it doesn't exist yet
            if (uniswapV2Pair == address(0)) {
                uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory())
                    .getPair(address(this), uniswapV2Router.WETH());
            }
            
            emit LiquidityAdded(uniswapV2Pair, liquidityTokens, msg.value);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
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
        uint256 _startTime,
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

    // Add rescue function to recover stuck tokens
    function rescueTokens(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot send to zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= balanceOf(address(this)), "Insufficient contract balance");
        
        // Force transfer tokens from contract to recipient
        _transfer(address(this), to, amount);
        
        // Log the recovery
        emit TokensClaimed(to, amount);
    }

    // Rescue all tokens to the specified recipients with percentage allocations
    function rescueTokensWithAllocation(address[] calldata recipients, uint256[] calldata percentages) external onlyOwner {
        require(recipients.length > 0, "Must provide at least one recipient");
        require(recipients.length == percentages.length, "Recipients and percentages length mismatch");
        
        // Verify total percentage is 100%
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            totalPercentage += percentages[i];
        }
        require(totalPercentage == 100, "Total percentage must be 100%");
        
        // Get contract balance
        uint256 contractBalance = balanceOf(address(this));
        require(contractBalance > 0, "No tokens to rescue");
        
        // Distribute tokens according to percentages
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            require(recipient != address(0), "Cannot send to zero address");
            
            uint256 tokenAmount = (contractBalance * percentages[i]) / 100;
            if (tokenAmount > 0) {
                _transfer(address(this), recipient, tokenAmount);
                emit TokensClaimed(recipient, tokenAmount);
            }
        }
    }
} 