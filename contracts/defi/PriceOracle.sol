// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PriceOracle is IPriceOracle, Ownable {
    mapping(address => uint256) private _prices;

    constructor() {
        _transferOwnership(msg.sender);
    }

    function getAssetPrice(address asset) external view returns (uint256) {
        return _prices[asset];
    }

    function setAssetPrice(address asset, uint256 price) external onlyOwner {
        _prices[asset] = price;
    }
} 