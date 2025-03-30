// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./RewardToken.sol";
import "./LendingPool.sol";

/**
 * @title LiquidityMining
 * @notice Distributes rewards to liquidity providers based on their participation
 */
contract LiquidityMining is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Reward token
    RewardToken public rewardToken;
    
    // Reward parameters
    struct RewardPool {
        uint256 rewardRate;           // Rewards per second
        uint256 rewardPerShareStored; // Accumulated rewards per share, scaled by 1e18
        uint256 lastUpdateTime;       // Last time rewards were updated
        uint256 totalStaked;          // Total staked LP tokens
    }
    
    // Pool info by lending pool
    mapping(address => RewardPool) public rewardPools;
    
    // User info 
    struct UserInfo {
        uint256 staked;                 // Amount of LP tokens staked
        uint256 rewardPerSharePaid;     // Reward per share already paid
        uint256 rewards;                // Accumulated rewards
    }
    
    // User info by pool and user
    mapping(address => mapping(address => UserInfo)) public userInfo;
    
    // Pool configuration
    address[] public activePools;
    
    // Initialization flag
    bool private initialized;
    
    // Events
    event PoolAdded(address indexed pool, uint256 rewardRate);
    event PoolRewardRateUpdated(address indexed pool, uint256 rewardRate);
    event Staked(address indexed user, address indexed pool, uint256 amount);
    event Withdrawn(address indexed user, address indexed pool, uint256 amount);
    event RewardPaid(address indexed user, address indexed pool, uint256 reward);
    
    /**
     * @notice Constructor for implementation contract
     */
    constructor() {
        // Empty constructor for implementation contract
    }
    
    /**
     * @notice Initialize the liquidity mining contract
     * @param _rewardToken The reward token address
     */
    function initialize(address _rewardToken) external {
        require(!initialized, "Already initialized");
        require(_rewardToken != address(0), "Invalid reward token");
        
        rewardToken = RewardToken(_rewardToken);
        initialized = true;
        _transferOwnership(msg.sender);
    }
    
    /**
     * @notice Add a new liquidity pool to the mining program
     * @param _pool The lending pool address
     * @param _rewardRate The reward rate per second
     */
    function addPool(address _pool, uint256 _rewardRate) external onlyOwner {
        require(_pool != address(0), "Invalid pool address");
        require(rewardPools[_pool].lastUpdateTime == 0, "Pool already added");
        
        rewardPools[_pool] = RewardPool({
            rewardRate: _rewardRate,
            rewardPerShareStored: 0,
            lastUpdateTime: block.timestamp,
            totalStaked: 0
        });
        
        activePools.push(_pool);
        
        emit PoolAdded(_pool, _rewardRate);
    }
    
    /**
     * @notice Update the reward rate for a pool
     * @param _pool The pool address
     * @param _rewardRate The new reward rate
     */
    function setRewardRate(address _pool, uint256 _rewardRate) external onlyOwner {
        require(rewardPools[_pool].lastUpdateTime > 0, "Pool not added");
        
        updatePool(_pool);
        rewardPools[_pool].rewardRate = _rewardRate;
        
        emit PoolRewardRateUpdated(_pool, _rewardRate);
    }
    
    /**
     * @notice Update rewards for a specific pool
     * @param _pool The pool address
     */
    function updatePool(address _pool) public {
        RewardPool storage pool = rewardPools[_pool];
        if (block.timestamp <= pool.lastUpdateTime) {
            return;
        }
        
        if (pool.totalStaked == 0) {
            pool.lastUpdateTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
        uint256 rewards = timeElapsed * pool.rewardRate;
        
        // Update rewards per share
        pool.rewardPerShareStored += (rewards * 1e18) / pool.totalStaked;
        pool.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @notice Get pending rewards for a user
     * @param _pool The pool address
     * @param _user The user address
     * @return Pending rewards
     */
    function pendingRewards(address _pool, address _user) public view returns (uint256) {
        RewardPool storage pool = rewardPools[_pool];
        UserInfo storage user = userInfo[_pool][_user];
        
        uint256 rewardPerShare = pool.rewardPerShareStored;
        
        if (block.timestamp > pool.lastUpdateTime && pool.totalStaked > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastUpdateTime;
            uint256 rewards = timeElapsed * pool.rewardRate;
            rewardPerShare += (rewards * 1e18) / pool.totalStaked;
        }
        
        return user.staked * (rewardPerShare - user.rewardPerSharePaid) / 1e18 + user.rewards;
    }
    
    /**
     * @notice Stake LP tokens to earn rewards
     * @param _pool The pool address
     * @param _amount The amount to stake
     */
    function stake(address _pool, uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        require(rewardPools[_pool].lastUpdateTime > 0, "Pool not active");
        
        updatePool(_pool);
        
        RewardPool storage pool = rewardPools[_pool];
        UserInfo storage user = userInfo[_pool][msg.sender];
        
        // Calculate pending rewards
        if (user.staked > 0) {
            uint256 pending = user.staked * (pool.rewardPerShareStored - user.rewardPerSharePaid) / 1e18;
            user.rewards += pending;
        }
        
        // Transfer LP tokens from user
        IERC20(_pool).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update user stake
        user.staked += _amount;
        user.rewardPerSharePaid = pool.rewardPerShareStored;
        
        // Update pool total
        pool.totalStaked += _amount;
        
        emit Staked(msg.sender, _pool, _amount);
    }
    
    /**
     * @notice Withdraw staked LP tokens
     * @param _pool The pool address
     * @param _amount The amount to withdraw
     */
    function withdraw(address _pool, uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot withdraw 0");
        
        UserInfo storage user = userInfo[_pool][msg.sender];
        require(user.staked >= _amount, "Insufficient staked amount");
        
        updatePool(_pool);
        
        RewardPool storage pool = rewardPools[_pool];
        
        // Calculate pending rewards
        uint256 pending = user.staked * (pool.rewardPerShareStored - user.rewardPerSharePaid) / 1e18;
        user.rewards += pending;
        
        // Update user stake
        user.staked -= _amount;
        user.rewardPerSharePaid = pool.rewardPerShareStored;
        
        // Update pool total
        pool.totalStaked -= _amount;
        
        // Transfer LP tokens back to user
        IERC20(_pool).safeTransfer(msg.sender, _amount);
        
        emit Withdrawn(msg.sender, _pool, _amount);
    }
    
    /**
     * @notice Claim pending rewards
     * @param _pool The pool address
     */
    function claim(address _pool) external nonReentrant {
        updatePool(_pool);
        
        RewardPool storage pool = rewardPools[_pool];
        UserInfo storage user = userInfo[_pool][msg.sender];
        
        // Calculate pending rewards
        uint256 pending = user.staked * (pool.rewardPerShareStored - user.rewardPerSharePaid) / 1e18;
        uint256 totalRewards = user.rewards + pending;
        
        // Reset user rewards
        user.rewards = 0;
        user.rewardPerSharePaid = pool.rewardPerShareStored;
        
        // Mint reward tokens to user
        rewardToken.mint(msg.sender, totalRewards);
        
        emit RewardPaid(msg.sender, _pool, totalRewards);
    }
    
    /**
     * @notice Get the number of active pools
     * @return Number of active pools
     */
    function poolLength() external view returns (uint256) {
        return activePools.length;
    }
} 