// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInterestRateModel {
    /**
     * @notice Calculate the borrow rate based on utilization
     * @param utilization The current utilization rate (0-1e18)
     * @return The borrow rate (0-1e18)
     */
    function getBorrowRate(uint256 utilization) external view returns (uint256);

    /**
     * @notice Calculate the supply rate based on utilization and borrow rate
     * @param utilization The current utilization rate (0-1e18)
     * @param borrowRate The current borrow rate (0-1e18)
     * @param reserveFactor The reserve factor (0-1e18)
     * @return The supply rate (0-1e18)
     */
    function getSupplyRate(
        uint256 utilization,
        uint256 borrowRate,
        uint256 reserveFactor
    ) external view returns (uint256);
} 