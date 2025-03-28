// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FeeCollector
 * @notice Contract for collecting and managing protocol fees from lending pools
 */
contract FeeCollector is Ownable {
    using SafeERC20 for IERC20;

    // Protocol fee parameters
    uint256 public poolCreationFee;                      // Fee in wei to create a pool
    uint256 public protocolFeePercentage;                // Percentage of interest (e.g., 10% = 1000)
    
    // Fee distribution parameters
    address public treasury;                             // Treasury address to receive fees
    
    // Events
    event PoolCreationFeeChanged(uint256 oldFee, uint256 newFee);
    event ProtocolFeePercentageChanged(uint256 oldPercentage, uint256 newPercentage);
    event TreasuryAddressChanged(address oldTreasury, address newTreasury);
    event FeeCollected(address indexed token, uint256 amount);
    event FeeWithdrawn(address indexed token, uint256 amount, address indexed recipient);
    
    /**
     * @notice Initialize the fee collector
     * @param _treasury Address of the treasury
     * @param _poolCreationFee Initial pool creation fee in wei
     * @param _protocolFeePercentage Initial protocol fee percentage (e.g., 10% = 1000)
     */
    constructor(
        address _treasury,
        uint256 _poolCreationFee,
        uint256 _protocolFeePercentage
    ) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        require(_protocolFeePercentage <= 5000, "Fee too high"); // Cap at 50%
        
        treasury = _treasury;
        poolCreationFee = _poolCreationFee;
        protocolFeePercentage = _protocolFeePercentage;
    }
    
    /**
     * @notice Collect fees in native currency (ETH)
     * @dev Called by the factory when creating a pool
     */
    function collectPoolCreationFee() external payable {
        require(msg.value >= poolCreationFee, "Insufficient fee");
        
        // Refund excess fee if any
        uint256 excess = msg.value - poolCreationFee;
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @notice Collect fees for a specific token
     * @param token The token address
     * @param amount The amount to collect
     */
    function collectTokenFee(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit FeeCollected(token, amount);
    }
    
    /**
     * @notice Withdraw collected fees (native currency)
     */
    function withdrawNativeFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(treasury).call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @notice Withdraw collected fees for a specific token
     * @param token The token address
     */
    function withdrawTokenFees(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        
        IERC20(token).safeTransfer(treasury, balance);
        emit FeeWithdrawn(token, balance, treasury);
    }
    
    /**
     * @notice Set the pool creation fee
     * @param newFee New pool creation fee in wei
     */
    function setPoolCreationFee(uint256 newFee) external onlyOwner {
        emit PoolCreationFeeChanged(poolCreationFee, newFee);
        poolCreationFee = newFee;
    }
    
    /**
     * @notice Set the protocol fee percentage
     * @param newPercentage New protocol fee percentage (e.g., 10% = 1000)
     */
    function setProtocolFeePercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage <= 5000, "Fee too high"); // Cap at 50%
        emit ProtocolFeePercentageChanged(protocolFeePercentage, newPercentage);
        protocolFeePercentage = newPercentage;
    }
    
    /**
     * @notice Set the treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        emit TreasuryAddressChanged(treasury, newTreasury);
        treasury = newTreasury;
    }
    
    /**
     * @notice Get the current protocol fee percentage
     * @return The protocol fee percentage
     */
    function getProtocolFeePercentage() external view returns (uint256) {
        return protocolFeePercentage;
    }
    
    /**
     * @notice Get the current pool creation fee
     * @return The pool creation fee in wei
     */
    function getPoolCreationFee() external view returns (uint256) {
        return poolCreationFee;
    }
    
    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
} 