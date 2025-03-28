// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./LendingPool.sol";
import "./FeeCollector.sol";

/**
 * @title LoanPoolFactory
 * @notice Factory contract for deploying lending pools
 */
contract LoanPoolFactory is Ownable {
    using Clones for address;

    // Implementation contract address
    address public immutable implementation;
    
    // Registry of deployed pools
    mapping(address => address) public assetToPools;
    address[] public allPools;
    
    // Protocol configuration
    address public priceOracle;
    address public interestRateModel;
    address public feeCollector;
    
    // Events
    event PoolCreated(address indexed asset, address indexed pool, string name, string symbol);
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event InterestRateModelUpdated(address indexed oldModel, address indexed newModel);
    
    constructor(
        address _implementation,
        address _priceOracle,
        address _interestRateModel,
        address _feeCollector
    ) Ownable(msg.sender) {
        require(_implementation != address(0), "Invalid implementation");
        require(_priceOracle != address(0), "Invalid oracle");
        require(_interestRateModel != address(0), "Invalid rate model");
        require(_feeCollector != address(0), "Invalid fee collector");
        
        implementation = _implementation;
        priceOracle = _priceOracle;
        interestRateModel = _interestRateModel;
        feeCollector = _feeCollector;
    }
    
    /**
     * @notice Create a new lending pool for a specific asset
     * @param _asset The underlying asset address (e.g., USDC)
     * @param _name The name of the lending pool
     * @param _symbol The symbol of the lending pool
     * @param _collateralFactorBps The collateral factor in basis points (e.g., 75% = 7500)
     * @param _reserveFactorBps The reserve factor in basis points (e.g., 10% = 1000)
     * @return The address of the newly created pool
     */
    function createLendingPool(
        address _asset,
        string memory _name,
        string memory _symbol,
        uint256 _collateralFactorBps,
        uint256 _reserveFactorBps
    ) external payable returns (address) {
        // Check if pool already exists
        require(assetToPools[_asset] == address(0), "Pool already exists");
        require(_asset != address(0), "Invalid asset address");
        require(_collateralFactorBps <= 10000, "Invalid collateral factor");
        require(_reserveFactorBps <= 10000, "Invalid reserve factor");
        
        // Collect creation fee
        uint256 fee = FeeCollector(feeCollector).getPoolCreationFee();
        require(msg.value >= fee, "Insufficient fee");
        
        // Process fee payment
        if (fee > 0) {
            FeeCollector(feeCollector).collectPoolCreationFee{value: fee}();
        }
        
        // Refund excess payment if any
        uint256 excess = msg.value - fee;
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund failed");
        }
        
        // Deploy new pool using minimal proxy pattern
        address pool = implementation.clone();
        
        // Initialize the pool
        LendingPool(pool).initialize(
            _asset,
            _name,
            _symbol,
            _collateralFactorBps,
            _reserveFactorBps,
            priceOracle,
            interestRateModel,
            feeCollector  // Pass fee collector to the pool
        );
        
        // Register pool
        assetToPools[_asset] = pool;
        allPools.push(pool);
        
        emit PoolCreated(_asset, pool, _name, _symbol);
        return pool;
    }
    
    /**
     * @notice Update the price oracle address
     * @param _newOracle The new price oracle address
     */
    function setPriceOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle address");
        address oldOracle = priceOracle;
        priceOracle = _newOracle;
        emit PriceOracleUpdated(oldOracle, _newOracle);
    }
    
    /**
     * @notice Update the interest rate model
     * @param _newModel The new interest rate model address
     */
    function setInterestRateModel(address _newModel) external onlyOwner {
        require(_newModel != address(0), "Invalid model address");
        address oldModel = interestRateModel;
        interestRateModel = _newModel;
        emit InterestRateModelUpdated(oldModel, _newModel);
    }
    
    /**
     * @notice Get the total number of pools
     * @return The number of pools
     */
    function getPoolCount() external view returns (uint256) {
        return allPools.length;
    }
    
    /**
     * @notice Get all pool addresses
     * @return Array of pool addresses
     */
    function getAllPools() external view returns (address[] memory) {
        return allPools;
    }
} 