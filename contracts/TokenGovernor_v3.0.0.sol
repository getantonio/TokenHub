// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title TokenGovernor_v3.0.0
 * @notice Governance contract for DAO operations
 * @dev Extends OpenZeppelin Governor with timelock and voting features
 */
contract TokenGovernor_v3_0_0 is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /**
     * @notice Creates a new governor instance
     * @param _token The governance token that will be used for voting
     * @param _timelock The timelock controller that will execute proposals
     * @param _votingDelay The delay before voting starts in blocks
     * @param _votingPeriod The voting period in blocks
     * @param _proposalThreshold The minimum amount of votes to create a proposal
     * @param _quorumNumerator The percentage of total supply required for quorum
     */
    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumNumerator
    )
        Governor("TokenGovernor")
        GovernorSettings(
            _votingDelay,
            _votingPeriod,
            _proposalThreshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumNumerator)
        GovernorTimelockControl(_timelock)
    {}

    /**
     * @notice Module that determines if a proposal is in the execution phase
     * @param proposalId The ID of the proposal
     * @return bool True if the proposal is being executed
     */
    function isInExecution(uint256 proposalId) public view returns (bool) {
        return state(proposalId) == ProposalState.Queued;
    }

    /**
     * @notice Module that determines if an account can participate in a proposal
     * @param account The account to check
     * @param blockNumber The block number to check at
     * @return uint256 The voting power of the account
     */
    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(Governor, IGovernor)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    /**
     * @notice Module that determines the minimum number of votes required to create a proposal
     * @return uint256 The minimum number of votes required
     */
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    /**
     * @notice Module that determines how votes are counted
     * @param proposalId The ID of the proposal
     * @return ProposalState The current state of the proposal
     */
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    /**
     * @notice Module that prepares a proposal for execution
     * @param targets The addresses to call
     * @param values The ETH values to send
     * @param calldatas The call data to send
     * @param descriptionHash The hash of the proposal description
     * @return uint256 The ID of the proposal
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory descriptionHash
    )
        public
        override(Governor, IGovernor)
        returns (uint256)
    {
        return super.propose(targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice Module that executes a proposal
     * @param proposalId The ID of the proposal
     * @param targets The addresses to call
     * @param values The ETH values to send
     * @param calldatas The call data to send
     * @param descriptionHash The hash of the proposal description
     */
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice Module that cancels a proposal
     * @param targets The addresses to call
     * @param values The ETH values to send
     * @param calldatas The call data to send
     * @param descriptionHash The hash of the proposal description
     * @return uint256 The ID of the cancelled proposal
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice Module that determines the execution delay for a proposal
     * @param targets The addresses to call
     * @param values The ETH values to send
     * @param calldatas The call data to send
     * @param descriptionHash The hash of the proposal description
     * @return uint256 The delay before execution
     */
    function proposalDelay(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public view returns (uint256) {
        return TimelockController(payable(address(timelock()))).getMinDelay();
    }

    /**
     * @notice Module that determines if a proposal needs queuing
     * @return bool True if proposals need to be queued
     */
    function proposalNeedsQueuing() public pure returns (bool) {
        return true;
    }

    /**
     * @notice Returns the timelock
     * @return TimelockController The timelock controller
     */
    function getTimelock() public view returns (TimelockController) {
        return TimelockController(payable(address(timelock())));
    }

    function _executor() internal view virtual override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 