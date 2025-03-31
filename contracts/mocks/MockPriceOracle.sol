// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceOracle
 * @notice A simple mock price oracle for testing purposes
 */
contract MockPriceOracle is Ownable {
    // Mapping of asset address to its price in USD (with 18 decimals)
    mapping(address => uint256) private assetPrices;
    
    // Events
    event PriceSet(address indexed asset, uint256 price);
    
    /**
     * @notice Constructor
     */
    constructor() Ownable() {
        _transferOwnership(msg.sender);
    }
    
    /**
     * @notice Sets the price of an asset
     * @param asset The address of the asset
     * @param price The price of the asset in USD (with 18 decimals)
     */
    function setPrice(address asset, uint256 price) external onlyOwner {
        assetPrices[asset] = price;
        emit PriceSet(asset, price);
    }
    
    /**
     * @notice Bulk sets prices for multiple assets
     * @param assets The addresses of the assets
     * @param prices The prices of the assets in USD (with 18 decimals)
     */
    function setBulkPrices(address[] calldata assets, uint256[] calldata prices) external onlyOwner {
        require(assets.length == prices.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            assetPrices[assets[i]] = prices[i];
            emit PriceSet(assets[i], prices[i]);
        }
    }
    
    /**
     * @notice Gets the price of an asset
     * @param asset The address of the asset
     * @return The price of the asset in USD (with 18 decimals)
     */
    function getPrice(address asset) external view returns (uint256) {
        // Return default value of 1 USD if price is not set
        if (assetPrices[asset] == 0) {
            return 1e18;
        }
        return assetPrices[asset];
    }
    
    /**
     * @notice Gets prices for multiple assets
     * @param assets The addresses of the assets
     * @return prices The prices of the assets in USD (with 18 decimals)
     */
    function getPrices(address[] calldata assets) external view returns (uint256[] memory) {
        uint256[] memory assetPricesArray = new uint256[](assets.length);
        
        for (uint256 i = 0; i < assets.length; i++) {
            assetPricesArray[i] = this.getPrice(assets[i]);
        }
        
        return assetPricesArray;
    }
    
    /**
     * @notice Checks if an asset has a price set
     * @param asset The address of the asset
     * @return Whether the asset has a price set
     */
    function hasPrice(address asset) external view returns (bool) {
        return assetPrices[asset] > 0;
    }
} 