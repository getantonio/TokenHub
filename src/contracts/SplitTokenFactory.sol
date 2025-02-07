// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "./SplitToken.sol";

contract SplitTokenFactory {
    event TokenCreated(
        address tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply,
        address[] wallets,
        uint256[] percentages
    );

    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address[] memory wallets,
        uint256[] memory percentages
    ) external returns (address) {
        // Deploy new token contract
        SplitToken token = new SplitToken(
            name,
            symbol,
            totalSupply,
            wallets,
            percentages
        );

        // Emit event with token details
        emit TokenCreated(
            address(token),
            name,
            symbol,
            totalSupply,
            wallets,
            percentages
        );

        return address(token);
    }
} 