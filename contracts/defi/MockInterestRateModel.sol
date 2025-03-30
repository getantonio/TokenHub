// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IInterestRateModel.sol";

/**
 * @title MockInterestRateModel
 * @notice A mock interest rate model for testing purposes
 */
contract MockInterestRateModel is IInterestRateModel, Ownable {
    // Base rate when utilization is 0%
    uint256 public baseRate;
    
    // Multiplier for utilization
    uint256 public multiplier;
    
    // Jump multiplier for high utilization
    uint256 public jumpMultiplier;
    
    // Utilization point at which the jump multiplier is applied
    uint256 public kink;
    
    /**
     * @notice Constructor to create a MockInterestRateModel
     * @param baseRate_ The base interest rate when utilization is 0
     * @param multiplier_ The rate multiplier as utilization increases
     * @param jumpMultiplier_ The multiplier after kink utilization
     * @param kink_ The utilization point at which the jump multiplier is applied
     */
    constructor(
        uint256 baseRate_,
        uint256 multiplier_,
        uint256 jumpMultiplier_,
        uint256 kink_
    ) {
        baseRate = baseRate_;
        multiplier = multiplier_;
        jumpMultiplier = jumpMultiplier_;
        kink = kink_;
    }
    
    /**
     * @notice Update the model parameters
     * @param baseRate_ The new base rate when utilization is 0
     * @param multiplier_ The new rate multiplier as utilization increases
     * @param jumpMultiplier_ The new multiplier after kink utilization
     * @param kink_ The new utilization point at which the jump multiplier is applied
     */
    function updateModelParameters(
        uint256 baseRate_,
        uint256 multiplier_,
        uint256 jumpMultiplier_,
        uint256 kink_
    ) external onlyOwner {
        baseRate = baseRate_;
        multiplier = multiplier_;
        jumpMultiplier = jumpMultiplier_;
        kink = kink_;
    }
    
    /**
     * @notice Get the borrow rate based on utilization rate
     * @param utilizationRate The utilization rate (scaled by 10000)
     * @return The borrow rate per year (scaled by 10000)
     */
    function getBorrowRate(uint256 utilizationRate) external view override returns (uint256) {
        if (utilizationRate <= kink) {
            return baseRate + (utilizationRate * multiplier) / 10000;
        } else {
            uint256 normalRate = baseRate + (kink * multiplier) / 10000;
            uint256 excessUtil = utilizationRate - kink;
            return normalRate + (excessUtil * jumpMultiplier) / 10000;
        }
    }
    
    /**
     * @notice Get the supply rate based on utilization rate and reserve factor
     * @param utilizationRate The utilization rate in basis points
     * @param reserveFactorBps The reserve factor in basis points
     * @return The supply rate in basis points
     */
    function getSupplyRate(uint256 utilizationRate, uint256 reserveFactorBps) external view override returns (uint256) {
        // borrowRate * utilizationRate * (1 - reserveFactor)
        uint256 borrowRate = this.getBorrowRate(utilizationRate);
        return borrowRate * utilizationRate * (10000 - reserveFactorBps) / (10000 * 10000);
    }
} 