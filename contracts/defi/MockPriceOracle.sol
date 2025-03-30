// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPriceOracle.sol";

/**
 * @title MockPriceOracle
 * @notice A mock price oracle for testing purposes
 */
contract MockPriceOracle is IPriceOracle, Ownable {
    mapping(address => uint256) private prices;
    
    /**
     * @notice Set the price of an asset
     * @param asset The asset address
     * @param price The price of the asset in ETH (scaled by 1e18)
     */
    function setAssetPrice(address asset, uint256 price) external onlyOwner {
        prices[asset] = price;
    }
    
    /**
     * @notice Get the price of an asset in terms of ETH
     * @param asset The address of the asset
     * @return The price of the asset (scaled by 1e18)
     */
    function getAssetPrice(address asset) external view override returns (uint256) {
        uint256 price = prices[asset];
        require(price > 0, "Price not available");
        return price;
    }
    
    /**
     * @notice Set prices for multiple assets at once
     * @param assets Array of asset addresses
     * @param prices_ Array of prices in ETH (scaled by 1e18)
     */
    function setAssetPrices(address[] calldata assets, uint256[] calldata prices_) external onlyOwner {
        require(assets.length == prices_.length, "Array length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            prices[assets[i]] = prices_[i];
        }
    }
} 