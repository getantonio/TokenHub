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
    
    // Wallet allocations
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

    WalletAllocation[] public walletAllocations;
    
    // Vesting tracking
    mapping(address => uint256) public vestedAmount;
    mapping(address => uint256) public claimedAmount;
    mapping(address => uint256) public vestingStartTime;
    
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
    event Paused();
    event Unpaused();

    IUniswapV2Router02 public immutable uniswapV2Router;
    address public immutable uniswapV2Pair;
    
    string private tokenName;
    string private tokenSymbol;
    
    // Add these state variables after the other declarations
    uint256 public liquidityAllocation;
    uint256 public remainingLiquidityAllocation;
    
    constructor() ERC20("", "") {
        // BSC Testnet PancakeSwap Router
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0xD99D1c33F9fC3444f8101754aBC46c52416550D1);
        uniswapV2Router = _uniswapV2Router;
        
        // Create pair
        uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
            .createPair(address(this), _uniswapV2Router.WETH());
    }

    function initialize(
        InitParams calldata params
    ) external payable {
        require(totalSupply() == 0, "Already initialized");

        // Set token name and symbol
        tokenName = params.name;
        tokenSymbol = params.symbol;
        
        // Set basic parameters
        maxSupply = params.maxSupply;
        blacklistEnabled = params.enableBlacklist;
        timeLockEnabled = params.enableTimeLock;
        
        // Set presale parameters
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
        
        // Calculate and mint initial supply
        uint256 totalTokensNeeded = params.initialSupply;
        _mint(address(this), totalTokensNeeded);
        
        uint256 remainingTokens = totalTokensNeeded;
        uint256 allocatedTokens = 0;
        
        // Reserve presale tokens if enabled
        if (presaleEnabled) {
            uint256 presaleTokens = (totalTokensNeeded * params.presalePercentage) / 100;
            allocatedTokens += presaleTokens;
            remainingTokens -= presaleTokens;
        }
        
        // Set liquidity allocation
        liquidityAllocation = (totalTokensNeeded * params.liquidityPercentage) / 100;
        remainingLiquidityAllocation = liquidityAllocation;
        allocatedTokens += liquidityAllocation;
        remainingTokens -= liquidityAllocation;
        
        // If there's ETH sent with initialization, add liquidity
        if (msg.value > 0 && liquidityAllocation > 0) {
            addLiquidity(liquidityAllocation, msg.value);
        }
        
        // Set wallet allocations and distribute tokens
        if (params.walletAllocations.length > 0) {
            for (uint256 i = 0; i < params.walletAllocations.length; i++) {
                walletAllocations.push(params.walletAllocations[i]);
                uint256 walletTokens = (totalTokensNeeded * params.walletAllocations[i].percentage) / 100;
                allocatedTokens += walletTokens;
                
                // Ensure we don't exceed total supply
                require(allocatedTokens <= totalTokensNeeded, "Total allocation exceeds initial supply");
                
                if (params.walletAllocations[i].vestingEnabled) {
                    vestingStartTime[params.walletAllocations[i].wallet] = 
                        params.walletAllocations[i].vestingStartTime;
                    vestedAmount[params.walletAllocations[i].wallet] = walletTokens;
                } else {
                    _transfer(address(this), params.walletAllocations[i].wallet, walletTokens);
                }
            }
        }
        
        // Ensure total allocation is 100%
        require(allocatedTokens == totalTokensNeeded, "Total allocation must equal initial supply");
        
        // Transfer ownership
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

    // Vesting claim function
    function claimVestedTokens() external nonReentrant {
        require(vestedAmount[msg.sender] > 0, "No tokens to claim");
        
        uint256 claimableAmount = 0;
        for (uint256 i = 0; i < walletAllocations.length; i++) {
            if (walletAllocations[i].wallet == msg.sender && walletAllocations[i].vestingEnabled) {
                // Check if cliff period has passed
                require(
                    block.timestamp >= vestingStartTime[msg.sender] + walletAllocations[i].cliffDuration,
                    "Cliff period not ended"
                );
                
                uint256 timeSinceStart = block.timestamp - vestingStartTime[msg.sender];
                if (timeSinceStart >= walletAllocations[i].vestingDuration) {
                    // Vesting completed, claim all remaining tokens
                    claimableAmount = vestedAmount[msg.sender] - claimedAmount[msg.sender];
                } else {
                    // Calculate vested tokens based on time
                    uint256 vestedTokens = (vestedAmount[msg.sender] * timeSinceStart) / 
                        walletAllocations[i].vestingDuration;
                    claimableAmount = vestedTokens - claimedAmount[msg.sender];
                }
                break;
            }
        }
        
        require(claimableAmount > 0, "No tokens available to claim");
        
        claimedAmount[msg.sender] += claimableAmount;
        _transfer(address(this), msg.sender, claimableAmount);
        
        emit TokensClaimed(msg.sender, claimableAmount);
    }

    // View functions
    function isBlacklisted(address account) external view returns (bool) {
        return blacklistEnabled && _blacklist[account];
    }

    function getUnlockTime(address account) external view returns (uint256) {
        return timeLockEnabled ? _lockTime[account] : 0;
    }

    function getVestedAmount(address wallet) external view returns (uint256) {
        return vestedAmount[wallet];
    }

    function getClaimedAmount(address wallet) external view returns (uint256) {
        return claimedAmount[wallet];
    }

    function getWalletAllocations() external view returns (WalletAllocation[] memory) {
        return walletAllocations;
    }

    // Emergency functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) internal {
        // Approve router to spend tokens
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // Add liquidity
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            owner(),
            block.timestamp + 300 // 5 minutes deadline
        );
    }

    function addLiquidity(uint256 tokenAmount) external payable {
        require(msg.value > 0, "Must send ETH");
        require(tokenAmount > 0, "Must provide tokens");
        
        // Transfer tokens from user to contract
        _transfer(msg.sender, address(this), tokenAmount);
        
        // Approve router to spend tokens
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // Add liquidity
        uniswapV2Router.addLiquidityETH{value: msg.value}(
            address(this),
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            msg.sender, // LP tokens go to user
            block.timestamp + 300 // 5 minutes deadline
        );
    }

    function addLiquidityFromContract(uint256 tokenAmount) external payable onlyOwner {
        require(msg.value > 0, "Must send ETH");
        require(tokenAmount > 0, "Must provide tokens");
        require(tokenAmount <= remainingLiquidityAllocation, "Amount exceeds remaining liquidity allocation");
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient contract balance");
        
        // Update remaining allocation
        remainingLiquidityAllocation -= tokenAmount;
        
        // Approve router to spend tokens
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // Add liquidity directly from contract's balance
        uniswapV2Router.addLiquidityETH{value: msg.value}(
            address(this),
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            msg.sender, // LP tokens go to user
            block.timestamp + 300 // 5 minutes deadline
        );

        emit LiquidityAdded(uniswapV2Pair, tokenAmount, msg.value);
    }

    // Add a view function to check remaining liquidity allocation
    function getRemainingLiquidityAllocation() external view returns (uint256) {
        return remainingLiquidityAllocation;
    }
} 