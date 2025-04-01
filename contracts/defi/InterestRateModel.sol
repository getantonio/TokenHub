// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IInterestRateModel.sol";

contract InterestRateModel is IInterestRateModel {
    uint256 private constant BASE_RATE = 0.02e18; // 2% base rate
    uint256 private constant MULTIPLIER = 0.1e18; // 10% multiplier
    uint256 private constant JUMP_MULTIPLIER = 0.5e18; // 50% jump multiplier
    uint256 private constant OPTIMAL_UTILIZATION = 0.8e18; // 80% optimal utilization

    function getBorrowRate(uint256 utilizationRate) external view returns (uint256) {
        if (utilizationRate <= OPTIMAL_UTILIZATION) {
            return BASE_RATE + (utilizationRate * MULTIPLIER) / 1e18;
        } else {
            uint256 excessUtilization = utilizationRate - OPTIMAL_UTILIZATION;
            return BASE_RATE + (OPTIMAL_UTILIZATION * MULTIPLIER) / 1e18 + 
                   (excessUtilization * JUMP_MULTIPLIER) / 1e18;
        }
    }

    function getSupplyRate(uint256 utilizationRate, uint256 reserveFactorBps) external view returns (uint256) {
        uint256 borrowRate = this.getBorrowRate(utilizationRate);
        return (utilizationRate * borrowRate * (10000 - reserveFactorBps)) / 100000000;
    }
} 