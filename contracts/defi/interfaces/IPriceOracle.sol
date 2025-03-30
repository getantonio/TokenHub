// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPriceOracle
 * @notice Interface for price oracle contracts
 */
interface IPriceOracle {
    /**
     * @notice Get the price of an asset in terms of ETH
     * @param asset The address of the asset
     * @return The price of the asset (scaled by 1e18)
     */
    function getAssetPrice(address asset) external view returns (uint256);
} 