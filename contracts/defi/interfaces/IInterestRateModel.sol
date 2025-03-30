// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IInterestRateModel
 * @notice Interface for interest rate model contracts
 */
interface IInterestRateModel {
    /**
     * @notice Get the borrow rate based on utilization rate
     * @param utilizationRate The utilization rate (scaled by 10000)
     * @return The borrow rate per year (scaled by 10000)
     */
    function getBorrowRate(uint256 utilizationRate) external view returns (uint256);
    
    /**
     * @notice Get the supply rate based on utilization rate and reserve factor
     * @param utilizationRate The utilization rate in basis points
     * @param reserveFactorBps The reserve factor in basis points
     * @return The supply rate in basis points
     */
    function getSupplyRate(uint256 utilizationRate, uint256 reserveFactorBps) external view returns (uint256);
} 