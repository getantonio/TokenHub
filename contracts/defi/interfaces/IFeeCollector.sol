// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFeeCollector
 * @notice Interface for the FeeCollector contract
 */
interface IFeeCollector {
    function getPoolCreationFee() external view returns (uint256);
    function getProtocolFeePercentage() external view returns (uint256);
    function collectPoolCreationFee() external payable;
    function collectProtocolFees() external payable;
    function withdrawFees(address payable _to, uint256 _amount) external;
    function authorizeCaller(address _caller) external;
    function deauthorizeCaller(address _caller) external;
    function authorizedCallers(address _caller) external view returns (bool);
} 