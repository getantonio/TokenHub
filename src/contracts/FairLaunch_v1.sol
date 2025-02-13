// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract FairLaunch_v1 is ReentrancyGuard, Ownable, Pausable {
    struct FairLaunchInfo {
        IERC20 token;
        uint256 totalSellingAmount;
        uint256 softCap;
        uint256 maxContributionPerUser;
        uint256 liquidityPercent;     // 25-100%
        uint256 startTime;
        uint256 endTime;
        uint256 liquidityLockTime;    // in seconds
        bool finalized;
        uint256 totalContributed;
        address router;               // DEX router address
    }

    FairLaunchInfo public fairLaunchInfo;
    mapping(address => uint256) public contributions;
    
    // Events
    event FairLaunchCreated(
        address indexed token,
        uint256 totalSellingAmount,
        uint256 softCap,
        uint256 startTime,
        uint256 endTime
    );
    event Contributed(address indexed user, uint256 amount);
    event Finalized(uint256 totalRaised, uint256 liquidityAdded);
    event Refunded(address indexed user, uint256 amount);
    
    constructor(
        address _token,
        uint256 _totalSellingAmount,
        uint256 _softCap,
        uint256 _maxContributionPerUser,
        uint256 _liquidityPercent,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _liquidityLockTime,
        address _router
    ) {
        require(_liquidityPercent >= 25 && _liquidityPercent <= 100, "Invalid liquidity percent");
        require(_startTime > block.timestamp, "Invalid start time");
        require(_endTime > _startTime, "Invalid end time");
        require(_liquidityLockTime > 0, "Invalid lock time");
        
        fairLaunchInfo = FairLaunchInfo({
            token: IERC20(_token),
            totalSellingAmount: _totalSellingAmount,
            softCap: _softCap,
            maxContributionPerUser: _maxContributionPerUser,
            liquidityPercent: _liquidityPercent,
            startTime: _startTime,
            endTime: _endTime,
            liquidityLockTime: _liquidityLockTime,
            finalized: false,
            totalContributed: 0,
            router: _router
        });
        
        emit FairLaunchCreated(
            _token,
            _totalSellingAmount,
            _softCap,
            _startTime,
            _endTime
        );
    }
    
    function contribute() external payable nonReentrant whenNotPaused {
        require(block.timestamp >= fairLaunchInfo.startTime, "Not started");
        require(block.timestamp <= fairLaunchInfo.endTime, "Ended");
        require(!fairLaunchInfo.finalized, "Finalized");
        require(msg.value > 0, "Zero contribution");
        
        uint256 newContribution = contributions[msg.sender] + msg.value;
        require(newContribution <= fairLaunchInfo.maxContributionPerUser, "Exceeds max contribution");
        
        contributions[msg.sender] = newContribution;
        fairLaunchInfo.totalContributed += msg.value;
        
        emit Contributed(msg.sender, msg.value);
    }
    
    function finalize() external nonReentrant onlyOwner {
        require(block.timestamp > fairLaunchInfo.endTime || 
                fairLaunchInfo.totalContributed >= fairLaunchInfo.totalSellingAmount,
                "Cannot finalize yet");
        require(!fairLaunchInfo.finalized, "Already finalized");
        require(fairLaunchInfo.totalContributed >= fairLaunchInfo.softCap, "Softcap not reached");
        
        fairLaunchInfo.finalized = true;
        
        // Calculate amounts for liquidity
        uint256 liquidityAmount = (fairLaunchInfo.totalContributed * fairLaunchInfo.liquidityPercent) / 100;
        uint256 tokenLiquidityAmount = (fairLaunchInfo.totalSellingAmount * fairLaunchInfo.liquidityPercent) / 100;
        
        // Add liquidity
        IUniswapV2Router02 router = IUniswapV2Router02(fairLaunchInfo.router);
        fairLaunchInfo.token.approve(address(router), tokenLiquidityAmount);
        
        router.addLiquidityETH{value: liquidityAmount}(
            address(fairLaunchInfo.token),
            tokenLiquidityAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        // Lock liquidity (implement liquidity locking logic here)
        // This would typically involve transferring LP tokens to a timelock contract
        
        emit Finalized(fairLaunchInfo.totalContributed, liquidityAmount);
    }
    
    function claimRefund() external nonReentrant {
        require(block.timestamp > fairLaunchInfo.endTime, "Not ended");
        require(!fairLaunchInfo.finalized, "Finalized");
        require(fairLaunchInfo.totalContributed < fairLaunchInfo.softCap, "Softcap reached");
        
        uint256 amount = contributions[msg.sender];
        require(amount > 0, "Nothing to refund");
        
        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit Refunded(msg.sender, amount);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        require(!fairLaunchInfo.finalized, "Already finalized");
        payable(owner()).transfer(address(this).balance);
    }
    
    function emergencyWithdrawToken(address token) external onlyOwner {
        require(!fairLaunchInfo.finalized, "Already finalized");
        IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
    }
} 