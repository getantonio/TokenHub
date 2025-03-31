// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockInterestRateModel
 * @notice A simple mock interest rate model for testing purposes
 */
contract MockInterestRateModel is Ownable {
    // Base borrow rate (in percentage points with 2 decimals, e.g., 500 = 5.00%)
    uint256 public baseBorrowRate;
    
    // Slope of the interest rate model (in percentage points with 2 decimals)
    uint256 public slopeRate;
    
    // Events
    event BaseBorrowRateUpdated(uint256 oldRate, uint256 newRate);
    event SlopeRateUpdated(uint256 oldRate, uint256 newRate);
    
    /**
     * @notice Constructor with default values
     */
    constructor() Ownable() {
        _transferOwnership(msg.sender);
        baseBorrowRate = 500; // 5.00%
        slopeRate = 2000; // 20.00%
    }
    
    /**
     * @notice Sets the base borrow rate
     * @param _baseBorrowRate New base borrow rate (e.g., 500 = 5.00%)
     */
    function setBaseBorrowRate(uint256 _baseBorrowRate) external onlyOwner {
        uint256 oldRate = baseBorrowRate;
        baseBorrowRate = _baseBorrowRate;
        emit BaseBorrowRateUpdated(oldRate, _baseBorrowRate);
    }
    
    /**
     * @notice Sets the slope rate
     * @param _slopeRate New slope rate (e.g., 2000 = 20.00%)
     */
    function setSlopeRate(uint256 _slopeRate) external onlyOwner {
        uint256 oldRate = slopeRate;
        slopeRate = _slopeRate;
        emit SlopeRateUpdated(oldRate, _slopeRate);
    }
    
    /**
     * @notice Calculates the borrow rate based on utilization
     * @param utilization The utilization rate of the pool (1e18 = 100%)
     * @return The borrow rate (1e18 = 100%)
     */
    function getBorrowRate(uint256 utilization) external view returns (uint256) {
        // Convert utilization from 1e18 scale to percentage with 2 decimals
        uint256 utilizationPercentage = utilization / 1e14; // Convert from 1e18 to percentage with 2 decimals
        
        // Calculate the additional rate based on utilization
        uint256 additionalRate = utilizationPercentage * slopeRate / 10000;
        
        // Add base rate and additional rate
        uint256 borrowRateWithDecimals = baseBorrowRate + additionalRate;
        
        // Convert from percentage with 2 decimals to 1e18 scale
        return borrowRateWithDecimals * 1e14;
    }
    
    /**
     * @notice Calculates the supply rate based on utilization and borrow rate
     * @param utilization The utilization rate of the pool (1e18 = 100%)
     * @param reserveFactor The reserve factor (1e18 = 100%)
     * @return The supply rate (1e18 = 100%)
     */
    function getSupplyRate(uint256 utilization, uint256 reserveFactor) external view returns (uint256) {
        // Get the borrow rate
        uint256 borrowRate = this.getBorrowRate(utilization);
        
        // Calculate the portion of the borrow rate that goes to suppliers
        uint256 reserveAmount = borrowRate * reserveFactor / 1e18;
        uint256 supplierAmount = borrowRate - reserveAmount;
        
        // Apply the utilization rate to get the supply rate
        return supplierAmount * utilization / 1e18;
    }
} 