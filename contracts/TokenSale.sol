// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenSale is ReentrancyGuard, Ownable {
    IERC20 public token;
    uint256 public tokenPrice;
    uint256 public hardCap;
    uint256 public totalSold;
    bool public saleActive;

    constructor(
        address _token,
        uint256 _tokenPrice,
        uint256 _hardCap
    ) {
        token = IERC20(_token);
        tokenPrice = _tokenPrice;
        hardCap = _hardCap;
        saleActive = true;
    }

    function purchaseTokens() external payable nonReentrant {
        require(saleActive, "Sale is not active");
        require(msg.value > 0, "Amount must be greater than 0");
        require(totalSold < hardCap, "Hard cap reached");

        uint256 tokenAmount = (msg.value * (10**18)) / tokenPrice;
        require(token.balanceOf(address(this)) >= tokenAmount, "Insufficient tokens in contract");

        totalSold += tokenAmount;
        token.transfer(msg.sender, tokenAmount);
    }

    // Other necessary functions (withdraw, emergency stop, etc.)
} 