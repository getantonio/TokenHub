// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FeeMonitor {
    struct FeeTransaction {
        uint256 timestamp;
        uint256 amount;
        address deployer;
    }

    FeeTransaction[] public transactions;
    mapping(address => uint256) public deployerFees;
    uint256 public totalFees;
    uint256 public totalDeployments;

    event FeeCollected(
        address indexed deployer,
        uint256 amount,
        uint256 timestamp
    );

    function recordFee(address deployer, uint256 amount) external {
        transactions.push(FeeTransaction({
            timestamp: block.timestamp,
            amount: amount,
            deployer: deployer
        }));

        deployerFees[deployer] += amount;
        totalFees += amount;
        totalDeployments += 1;

        emit FeeCollected(deployer, amount, block.timestamp);
    }

    function getAnalytics() external view returns (
        uint256 _totalFees,
        uint256 _totalDeployments,
        FeeTransaction[] memory _recentTransactions
    ) {
        uint256 length = transactions.length;
        uint256 recentCount = length > 10 ? 10 : length;
        FeeTransaction[] memory recent = new FeeTransaction[](recentCount);

        for (uint256 i = 0; i < recentCount; i++) {
            recent[i] = transactions[length - recentCount + i];
        }

        return (totalFees, totalDeployments, recent);
    }
} 