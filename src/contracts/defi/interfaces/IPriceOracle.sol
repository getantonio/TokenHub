// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    /**
     * @notice Get the price of an asset
     * @param asset The asset address
     * @return The price in USD (with 18 decimals)
     */
    function getPrice(address asset) external view returns (uint256);
} 