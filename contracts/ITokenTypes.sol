// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ITokenTypes {
    struct WalletAllocation {
        address wallet;
        uint256 percentage;
        bool vestingEnabled;
        uint256 vestingDuration;
        uint256 cliffDuration;
        uint256 vestingStartTime;
    }
} 