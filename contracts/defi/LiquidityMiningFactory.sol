// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./LiquidityMining.sol";
import "./RewardToken.sol";

/**
 * @title LiquidityMiningFactory
 * @notice Factory for deploying liquidity mining programs
 */
contract LiquidityMiningFactory is Ownable {
    using Clones for address;
    
    // Implementation contracts
    address public liquidityMiningImplementation;
    address public rewardTokenImplementation;
    
    // Deployed programs
    mapping(address => address) public poolToMiningProgram;
    address[] public allMiningPrograms;
    
    // Deployed reward tokens
    mapping(address => address) public miningProgramToToken;
    
    // Events
    event MiningProgramCreated(
        address indexed pool,
        address indexed miningProgram,
        address indexed rewardToken,
        string name,
        string symbol
    );
    
    /**
     * @notice Constructor
     * @param _liquidityMiningImpl The liquidity mining implementation contract
     * @param _rewardTokenImpl The reward token implementation contract
     */
    constructor(
        address _liquidityMiningImpl,
        address _rewardTokenImpl
    ) {
        require(_liquidityMiningImpl != address(0), "Invalid mining implementation");
        require(_rewardTokenImpl != address(0), "Invalid token implementation");
        
        liquidityMiningImplementation = _liquidityMiningImpl;
        rewardTokenImplementation = _rewardTokenImpl;
    }
    
    /**
     * @notice Create a new liquidity mining program for a lending pool
     * @param _pool The lending pool address
     * @param _tokenName The reward token name
     * @param _tokenSymbol The reward token symbol
     * @param _rewardRate The initial reward rate (tokens per second)
     * @param _maxSupply The maximum token supply
     * @param _initialSupply The initial token supply
     * @return miningProgram The address of the deployed mining program
     * @return rewardToken The address of the deployed reward token
     */
    function createMiningProgram(
        address _pool,
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _rewardRate,
        uint256 _maxSupply,
        uint256 _initialSupply
    ) external onlyOwner returns (address miningProgram, address rewardToken) {
        // Check if pool already has a mining program
        require(poolToMiningProgram[_pool] == address(0), "Mining program already exists for pool");
        
        // Deploy reward token
        rewardToken = rewardTokenImplementation.clone();
        RewardToken(rewardToken).initialize(_tokenName, _tokenSymbol, _maxSupply, _initialSupply);
        
        // Deploy liquidity mining program
        miningProgram = liquidityMiningImplementation.clone();
        LiquidityMining(miningProgram).initialize(rewardToken);
        
        // Setup reward token ownership
        RewardToken(rewardToken).transferOwnership(miningProgram);
        
        // Add pool to the mining program
        LiquidityMining(miningProgram).addPool(_pool, _rewardRate);
        
        // Transfer ownership of the mining program to the caller
        LiquidityMining(miningProgram).transferOwnership(msg.sender);
        
        // Register the mining program
        poolToMiningProgram[_pool] = miningProgram;
        miningProgramToToken[miningProgram] = rewardToken;
        allMiningPrograms.push(miningProgram);
        
        emit MiningProgramCreated(_pool, miningProgram, rewardToken, _tokenName, _tokenSymbol);
        
        return (miningProgram, rewardToken);
    }
    
    /**
     * @notice Get the total number of mining programs
     * @return The number of mining programs
     */
    function getMiningProgramCount() external view returns (uint256) {
        return allMiningPrograms.length;
    }
    
    /**
     * @notice Get all mining program addresses
     * @return Array of mining program addresses
     */
    function getAllMiningPrograms() external view returns (address[] memory) {
        return allMiningPrograms;
    }
} 