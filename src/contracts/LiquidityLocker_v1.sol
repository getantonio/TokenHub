// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityLocker_v1 is ReentrancyGuard, Ownable {
    struct Lock {
        uint256 amount;
        uint256 unlockTime;
        bool isWithdrawn;
    }
    
    // LP token => owner => Lock
    mapping(address => mapping(address => Lock)) public locks;
    
    event LiquidityLocked(
        address indexed lpToken,
        address indexed owner,
        uint256 amount,
        uint256 unlockTime
    );
    
    event LiquidityUnlocked(
        address indexed lpToken,
        address indexed owner,
        uint256 amount
    );
    
    function lockLiquidity(
        address lpToken,
        uint256 amount,
        uint256 unlockTime
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        require(locks[lpToken][msg.sender].amount == 0, "Lock exists");
        
        IERC20(lpToken).transferFrom(msg.sender, address(this), amount);
        
        locks[lpToken][msg.sender] = Lock({
            amount: amount,
            unlockTime: unlockTime,
            isWithdrawn: false
        });
        
        emit LiquidityLocked(lpToken, msg.sender, amount, unlockTime);
    }
    
    function unlockLiquidity(address lpToken) external nonReentrant {
        Lock storage lock = locks[lpToken][msg.sender];
        require(lock.amount > 0, "No lock found");
        require(!lock.isWithdrawn, "Already withdrawn");
        require(block.timestamp >= lock.unlockTime, "Still locked");
        
        lock.isWithdrawn = true;
        IERC20(lpToken).transfer(msg.sender, lock.amount);
        
        emit LiquidityUnlocked(lpToken, msg.sender, lock.amount);
    }
    
    function getLock(address lpToken, address owner) 
        external 
        view 
        returns (
            uint256 amount,
            uint256 unlockTime,
            bool isWithdrawn
        ) 
    {
        Lock memory lock = locks[lpToken][owner];
        return (lock.amount, lock.unlockTime, lock.isWithdrawn);
    }
} 