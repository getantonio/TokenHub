// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeCollector
 * @notice Collects fees from lending pools
 */
contract FeeCollector is Ownable {
    uint256 public poolCreationFee = 0.01 ether;
    uint256 public protocolFeePercentage = 1000; // 10% in basis points
    
    // Allow specific addresses to collect fees
    mapping(address => bool) public authorizedCallers;
    
    event PoolCreationFeeCollected(address indexed from, uint256 amount);
    event ProtocolFeesCollected(address indexed from, uint256 amount);
    event PoolCreationFeeUpdated(uint256 newFee);
    event ProtocolFeePercentageUpdated(uint256 newPercentage);
    event CallerAuthorized(address indexed caller);
    event CallerDeauthorized(address indexed caller);
    
    /**
     * @notice Constructor to initialize the owner
     */
    constructor() {
        // Owner is automatically set to msg.sender by the Ownable contract
    }
    
    /**
     * @notice Authorize a caller to collect fees
     * @param _caller The address to authorize
     */
    function authorizeCaller(address _caller) external onlyOwner {
        require(_caller != address(0), "Invalid caller address");
        authorizedCallers[_caller] = true;
        emit CallerAuthorized(_caller);
    }
    
    /**
     * @notice Remove authorization from a caller
     * @param _caller The address to deauthorize
     */
    function deauthorizeCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = false;
        emit CallerDeauthorized(_caller);
    }
    
    /**
     * @notice Get the current pool creation fee
     * @return The pool creation fee
     */
    function getPoolCreationFee() external view returns (uint256) {
        return poolCreationFee;
    }
    
    /**
     * @notice Get the current protocol fee percentage
     * @return The protocol fee percentage in basis points
     */
    function getProtocolFeePercentage() external view returns (uint256) {
        return protocolFeePercentage;
    }
    
    /**
     * @notice Set the pool creation fee
     * @param _fee The new pool creation fee
     */
    function setPoolCreationFee(uint256 _fee) external onlyOwner {
        poolCreationFee = _fee;
        emit PoolCreationFeeUpdated(_fee);
    }
    
    /**
     * @notice Set the protocol fee percentage
     * @param _percentage The new protocol fee percentage in basis points
     */
    function setProtocolFeePercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 5000, "Fee too high"); // Max 50%
        protocolFeePercentage = _percentage;
        emit ProtocolFeePercentageUpdated(_percentage);
    }
    
    /**
     * @notice Collect the pool creation fee
     */
    function collectPoolCreationFee() external payable {
        // Allow owner or authorized callers
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Not authorized");
        require(msg.value >= poolCreationFee, "Insufficient fee");
        emit PoolCreationFeeCollected(msg.sender, msg.value);
    }
    
    /**
     * @notice Collect protocol fees from interest
     */
    function collectProtocolFees() external payable {
        // Allow owner or authorized callers
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Not authorized");
        emit ProtocolFeesCollected(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw collected fees
     * @param _to The address to send the fees to
     * @param _amount The amount to withdraw
     */
    function withdrawFees(address payable _to, uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        _to.transfer(_amount);
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
} 