// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "../TokenGovernor_v3.0.0.sol";
import "../Treasury_v3.0.0.sol";

library GovernanceSetup {
    struct GovernanceConfig {
        uint256 votingDelay;      // Delay before voting starts in blocks
        uint256 votingPeriod;     // Duration of voting in blocks
        uint256 proposalThreshold; // Minimum tokens required to create proposal
        uint256 quorumNumerator;  // Percentage of total supply required for quorum
        uint256 timelockDelay;    // Timelock delay in seconds
    }

    struct GovernanceContracts {
        address dao;
        address timelock;
        address treasury;
    }

    function setupGovernance(
        address token,
        GovernanceConfig memory config,
        address factoryAddress
    ) internal returns (GovernanceContracts memory) {
        // Deploy timelock
        TimelockController timelock = new TimelockController(
            config.timelockDelay,
            new address[](0),
            new address[](0),
            factoryAddress
        );

        // Deploy governor
        TokenGovernor_v3_0_0 governor = new TokenGovernor_v3_0_0(
            IVotes(token),
            timelock,
            config.votingDelay,
            config.votingPeriod,
            config.proposalThreshold,
            config.quorumNumerator
        );

        // Deploy treasury
        Treasury_v3_0_0 treasury = new Treasury_v3_0_0(
            address(timelock),
            token
        );

        // Setup roles
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0)); // Anyone can execute
        timelock.revokeRole(timelock.TIMELOCK_ADMIN_ROLE(), factoryAddress);

        return GovernanceContracts({
            dao: address(governor),
            timelock: address(timelock),
            treasury: address(treasury)
        });
    }
} 