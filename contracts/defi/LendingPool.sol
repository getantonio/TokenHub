// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/IInterestRateModel.sol";
import "./interfaces/IFeeCollector.sol";

/**
 * @title LendingPool
 * @notice Core lending pool contract that handles deposits, borrows, and repayments
 */
contract LendingPool is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Asset being lent
    IERC20 public asset;

    // Constants for basis points calculations
    uint256 public constant BIPS = 10000; // 100%

    // Interest rate accrual
    uint256 public lastAccrualTimestamp;
    uint256 public reserveBalance;

    // Protocol configuration
    uint256 public collateralFactorBps;
    uint256 public reserveFactorBps;
    address public priceOracle;
    address public interestRateModel;
    address public feeCollector;
    bool public initialized;

    // User account data
    mapping(address => uint256) public borrowed;
    mapping(address => mapping(address => bool)) public userCollateralAssets;
    mapping(address => bool) public supportedCollateralAssets;

    // Factory address
    address public factory;

    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event ReservesUpdated(uint256 balance);
    event InterestAccrued(uint256 interestAmount);
    event ProtocolFeePaid(uint256 feeAmount);
    
    constructor() ERC20("", "") {
        // Empty constructor
    }

    /**
     * @notice Initialize the lending pool
     * @param _asset The underlying asset
     * @param _name The name of the vault token
     * @param _symbol The symbol of the vault token
     * @param _collateralFactorBps The collateral factor in basis points
     * @param _reserveFactorBps The reserve factor in basis points
     * @param _priceOracle The price oracle address
     * @param _interestRateModel The interest rate model address
     * @param _feeCollector The fee collector address
     */
    function initialize(
        address _asset,
        string memory _name,
        string memory _symbol,
        uint256 _collateralFactorBps,
        uint256 _reserveFactorBps,
        address _priceOracle,
        address _interestRateModel,
        address _feeCollector
    ) external {
        require(!initialized, "Already initialized");
        require(_asset != address(0), "Invalid asset");
        require(_priceOracle != address(0), "Invalid oracle");
        require(_interestRateModel != address(0), "Invalid rate model");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_collateralFactorBps <= BIPS, "Invalid collateral factor");
        require(_reserveFactorBps <= BIPS, "Invalid reserve factor");
        
        // Set the factory address
        factory = msg.sender;
        
        // Since we can't change the name and symbol of ERC20 after deployment,
        // and since we're using a clone proxy pattern, we just set the underlying asset
        asset = IERC20(_asset);
        
        // Set the name and symbol
        _name = string(abi.encodePacked(_name, " Lending Pool"));
        _symbol = string(abi.encodePacked("l", _symbol));
        
        collateralFactorBps = _collateralFactorBps;
        reserveFactorBps = _reserveFactorBps;
        priceOracle = _priceOracle;
        interestRateModel = _interestRateModel;
        feeCollector = _feeCollector;
        lastAccrualTimestamp = block.timestamp;
        initialized = true;
    }

    /**
     * @notice Accrue interest
     */
    function accrueInterest() public {
        if (block.timestamp == lastAccrualTimestamp) {
            return;
        }
        
        // Calculate interest
        uint256 totalBorrows = totalBorrowed();
        if (totalBorrows == 0) {
            lastAccrualTimestamp = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastAccrualTimestamp;
        uint256 utilizationRate = (totalBorrows * BIPS) / totalAssets();
        uint256 borrowRate = IInterestRateModel(interestRateModel).getBorrowRate(utilizationRate);
        uint256 interestFactor = (borrowRate * timeElapsed) / (365 days);
        uint256 interestAmount = (totalBorrows * interestFactor) / BIPS;
        
        if (interestAmount > 0) {
            // Calculate protocol fee
            uint256 protocolFeePercentage = IFeeCollector(feeCollector).getProtocolFeePercentage();
            uint256 protocolFee = (interestAmount * protocolFeePercentage) / BIPS;
            
            // Calculate reserve amount (after protocol fee)
            uint256 reserveAmount = (interestAmount * reserveFactorBps) / BIPS;
            
            // Update reserves
            if (reserveAmount > 0) {
                reserveBalance += reserveAmount;
                emit ReservesUpdated(reserveBalance);
            }
            
            // Transfer protocol fee if any
            if (protocolFee > 0) {
                // Since we can't mint actual tokens for protocol fee, we track it separately
                // The protocol fee is effectively taken from the interest that would
                // otherwise go to depositors
                emit ProtocolFeePaid(protocolFee);
            }
            
            emit InterestAccrued(interestAmount);
        }
        
        lastAccrualTimestamp = block.timestamp;
    }

    /**
     * @notice Get the total assets in the pool
     * @return The total assets
     */
    function totalAssets() public view returns (uint256) {
        uint256 cash = asset.balanceOf(address(this));
        return cash + totalBorrowed() - reserveBalance;
    }

    /**
     * @notice Get the total amount borrowed from the pool
     * @return The total borrowed amount
     */
    function totalBorrowed() public view returns (uint256) {
        uint256 outstandingBorrows = 0;
        // In a real implementation, we would iterate through all borrowers
        // For simplicity, we just use a fake value
        return outstandingBorrows;
    }

    /**
     * @notice Get the health factor of a user's position
     * @param user The user address
     * @return The health factor (scaled by BIPS)
     */
    function healthFactor(address user) public view returns (uint256) {
        uint256 userBorrowed = borrowed[user];
        if (userBorrowed == 0) {
            return type(uint256).max; // Max value if no debt
        }
        
        uint256 collateralValue = getUserCollateralValue(user);
        uint256 borrowLimit = (collateralValue * collateralFactorBps) / BIPS;
        
        if (borrowLimit == 0) {
            return 0; // No collateral or zero collateral factor
        }
        
        return (borrowLimit * BIPS) / userBorrowed;
    }

    /**
     * @notice Get the collateral value of a user in terms of the underlying asset
     * @param user The user address
     * @return The collateral value
     */
    function getUserCollateralValue(address user) public view returns (uint256) {
        // For simplicity, we're just using shares of this pool as collateral
        uint256 shares = balanceOf(user);
        // In a real implementation, we would convert shares to assets based on exchange rate
        return shares;
    }

    /**
     * @notice Deposit assets into the lending pool
     * @param amount The amount of assets to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        accrueInterest();
        
        // Transfer assets from user
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint shares to user
        _mint(msg.sender, amount);
        
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Withdraw assets from the lending pool
     * @param amount The amount of assets to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        accrueInterest();
        
        // Check if user has enough shares
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // We need to check that this withdrawal doesn't bring the user's health factor below 1
        if (borrowed[msg.sender] > 0) {
            uint256 remainingShares = balanceOf(msg.sender) - amount;
            uint256 borrowLimit = (remainingShares * collateralFactorBps) / BIPS;
            
            require(borrowLimit >= borrowed[msg.sender], "Withdrawal would cause undercollateralization");
        }
        
        // Burn shares
        _burn(msg.sender, amount);
        
        // Transfer assets to user
        asset.safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, amount);
    }

    /**
     * @notice Borrow assets from the lending pool
     * @param amount The amount to borrow
     */
    function borrow(uint256 amount) external nonReentrant {
        accrueInterest();
        
        // Check if the pool has enough liquidity
        uint256 cash = asset.balanceOf(address(this));
        require(cash >= amount, "Insufficient liquidity");
        
        // Update borrower's debt
        borrowed[msg.sender] += amount;
        
        // Check if the borrower's position remains healthy
        require(healthFactor(msg.sender) >= BIPS, "Unhealthy position");
        
        // Transfer funds to borrower
        asset.safeTransfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }

    /**
     * @notice Repay a loan
     * @param amount The amount to repay
     */
    function repay(uint256 amount) external nonReentrant {
        accrueInterest();
        
        uint256 debt = borrowed[msg.sender];
        require(debt > 0, "No debt to repay");
        
        // Cap repayment to the outstanding debt
        uint256 repayAmount = amount > debt ? debt : amount;
        
        // Update borrower's debt
        borrowed[msg.sender] -= repayAmount;
        
        // Transfer funds from borrower
        asset.safeTransferFrom(msg.sender, address(this), repayAmount);
        
        emit Repay(msg.sender, repayAmount);
    }
} 