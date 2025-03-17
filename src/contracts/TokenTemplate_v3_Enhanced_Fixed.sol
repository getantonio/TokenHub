// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract TokenTemplate_v3_Enhanced_Fixed is 
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
    event LiquidityRemoved(address indexed pair, uint256 tokensRemoved, uint256 ethRemoved);
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliff
    );
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
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
        uniswapV2Router = IUniswapV2Router02(_router);
    }

    function initialize(InitParams calldata params) external payable {
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
            
            // Calculate liquidity tokens based on presale percentage
            uint256 liquidityTokens = (presaleTokens * params.liquidityPercentage) / 100;
            liquidityAllocation = liquidityTokens;
            remainingLiquidityAllocation = liquidityTokens;
            allocatedTokens += liquidityTokens;
        }
        
        // Process wallet allocations
        for (uint256 i = 0; i < params.walletAllocations.length; i++) {
            WalletAllocation memory allocation = params.walletAllocations[i];
            uint256 amount = (totalTokensNeeded * allocation.percentage) / 100;
            allocatedTokens += amount;
            
            if (allocation.vestingEnabled) {
                // Create vesting schedule
                vestingInfo[allocation.wallet] = VestingInfo({
                    totalAmount: amount,
                    claimedAmount: 0,
                    startTime: allocation.vestingStartTime,
                    duration: allocation.vestingDuration,
                    cliff: allocation.cliffDuration
                });
                
                emit VestingScheduleCreated(
                    allocation.wallet,
                    amount,
                    allocation.vestingStartTime,
                    allocation.vestingDuration,
                    allocation.cliffDuration
                );
            } else {
                // Transfer tokens directly
                _transfer(address(this), allocation.wallet, amount);
            }
        }
        
        // Transfer remaining tokens to owner
        if (remainingTokens > allocatedTokens) {
            _transfer(address(this), params.owner, remainingTokens - allocatedTokens);
        }
        
        // Transfer ownership
        if (params.owner != msg.sender) {
            _transferOwnership(params.owner);
        }
    }
    
    // Override token name and symbol
    function name() public view virtual override returns (string memory) {
        return tokenName;
    }
    
    function symbol() public view virtual override returns (string memory) {
        return tokenSymbol;
    }
    
    // Override transfer functions to check blacklist and timelock
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
        
        if (from != address(0) && to != address(0)) { // Skip minting and burning
            if (blacklistEnabled) {
                require(!_blacklist[from] && !_blacklist[to], "Address is blacklisted");
            }
            
            if (timeLockEnabled && _lockTime[from] > 0) {
                require(block.timestamp >= _lockTime[from], "Tokens are time-locked");
            }
        }
    }
    
    // Vesting Functions
    function claimVestedTokens() external nonReentrant {
        VestingInfo storage vesting = vestingInfo[msg.sender];
        require(vesting.totalAmount > 0, "No vesting schedule");
        
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        require(claimableAmount > 0, "No tokens to claim");
        
        vesting.claimedAmount += claimableAmount;
        _transfer(address(this), msg.sender, claimableAmount);
        
        emit TokensClaimed(msg.sender, claimableAmount);
    }
    
    function getVestingInfo(address beneficiary) external view returns (
        uint256 totalAmount,
        uint256 claimedAmount,
        uint256 claimableAmount,
        uint256 startTime,
        uint256 duration,
        uint256 cliff
    ) {
        VestingInfo memory vesting = vestingInfo[beneficiary];
        return (
            vesting.totalAmount,
            vesting.claimedAmount,
            getClaimableAmount(beneficiary),
            vesting.startTime,
            vesting.duration,
            vesting.cliff
        );
    }
    
    function getClaimableAmount(address beneficiary) public view returns (uint256) {
        VestingInfo memory vesting = vestingInfo[beneficiary];
        
        if (vesting.totalAmount == 0 || vesting.claimedAmount >= vesting.totalAmount) {
            return 0;
        }
        
        if (block.timestamp < vesting.startTime + vesting.cliff) {
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
        require(blacklistEnabled, "Blacklist not enabled");
        _blacklist[account] = status;
        emit BlacklistUpdated(account, status);
    }

    function isBlacklisted(address account) external view returns (bool) {
        return _blacklist[account];
    }

    // Time lock management
    function setTimeLock(address account, uint256 unlockTime) external onlyOwner {
        require(timeLockEnabled, "Time lock not enabled");
        _lockTime[account] = unlockTime;
        emit TimeLockSet(account, unlockTime);
    }

    function getUnlockTime(address account) external view returns (uint256) {
        return _lockTime[account];
    }

    // Pause/unpause
    function pause() external onlyOwner {
        _pause();
        emit Paused();
    }

    function unpause() external onlyOwner {
        _unpause();
        emit Unpaused();
    }

    // Override burn to emit event
    function burn(uint256 amount) public virtual override {
        super.burn(amount);
        emit TokensBurned(_msgSender(), amount);
    }

    // Override burnFrom to emit event
    function burnFrom(address account, uint256 amount) public virtual override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }

    // Minting Functions
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Would exceed max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function mintBatch(address[] calldata to, uint256[] calldata amounts) external onlyOwner {
        require(to.length == amounts.length, "Arrays length mismatch");
        uint256 totalAmount;
        for(uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(totalSupply() + totalAmount <= maxSupply, "Would exceed max supply");
        
        for(uint256 i = 0; i < to.length; i++) {
            _mint(to[i], amounts[i]);
            emit TokensMinted(to[i], amounts[i]);
        }
    }

    // LP Token Management Functions
    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) external payable onlyOwner {
        require(msg.value >= ethAmount, "Insufficient ETH sent");
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient token balance");
        
        // Approve router to spend tokens
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        
        // Add liquidity
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            owner(),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        // If pair doesn't exist yet, get it from the factory
        if (uniswapV2Pair == address(0)) {
            uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).getPair(
                address(this),
                uniswapV2Router.WETH()
            );
        }
        
        emit LiquidityAdded(uniswapV2Pair, amountToken, amountETH);
        
        // Refund excess ETH if any
        if (msg.value > ethAmount) {
            (bool success, ) = msg.sender.call{value: msg.value - ethAmount}("");
            require(success, "ETH refund failed");
        }
    }

    // New function to add liquidity from the contract's allocation
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

        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = uniswapV2Router.addLiquidityETH{value: msg.value}(
            address(this),
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            owner(),
            block.timestamp + 300 // 5 minutes deadline
        );

        emit LiquidityAdded(uniswapV2Pair, amountToken, amountETH);
        
        // Refund excess ETH if any
        if (msg.value > amountETH) {
            (bool success, ) = msg.sender.call{value: msg.value - amountETH}("");
            require(success, "ETH refund failed");
        }
    }

    function getRemainingLiquidityAllocation() external view returns (uint256) {
        return remainingLiquidityAllocation;
    }

    function removeLiquidity(uint256 lpTokenAmount) external onlyOwner {
        require(uniswapV2Pair != address(0), "No liquidity pair");
        require(IERC20(uniswapV2Pair).balanceOf(msg.sender) >= lpTokenAmount, "Insufficient LP tokens");
        
        // Approve router to spend LP tokens
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), lpTokenAmount);
        
        // Remove liquidity
        (uint256 amountToken, uint256 amountETH) = uniswapV2Router.removeLiquidityETH(
            address(this),
            lpTokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            msg.sender,
            block.timestamp + 300 // 5 minutes deadline
        );
        
        emit LiquidityRemoved(uniswapV2Pair, amountToken, amountETH);
    }

    // Helper Functions
    function getLPTokenBalance(address account) external view returns (uint256) {
        if (uniswapV2Pair == address(0)) return 0;
        return IERC20(uniswapV2Pair).balanceOf(account);
    }

    function getReserves() external view returns (uint256 tokenReserve, uint256 ethReserve) {
        if (uniswapV2Pair == address(0)) return (0, 0);
        
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(uniswapV2Pair).getReserves();
        
        // Check token ordering
        address token0 = IUniswapV2Pair(uniswapV2Pair).token0();
        if (address(this) == token0) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }

    // Liquidity Management
    function lockLiquidity(uint256 duration) external onlyOwner {
        require(uniswapV2Pair != address(0), "No liquidity pair");
        require(duration > 0, "Duration must be greater than 0");
        
        // Lock LP tokens by setting a time lock
        uint256 unlockTime = block.timestamp + duration;
        _lockTime[msg.sender] = unlockTime;
        
        emit TimeLockSet(msg.sender, unlockTime);
    }

    // Receive function to accept ETH
    receive() external payable {}
} 