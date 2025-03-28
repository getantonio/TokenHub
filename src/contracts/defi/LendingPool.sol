// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/IInterestRateModel.sol";
import "./FeeCollector.sol";

/**
 * @title LendingPool
 * @notice Core lending pool contract that handles deposits, borrows, and repayments
 */
contract LendingPool is ERC4626, ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

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

    // User account data
    mapping(address => uint256) public borrowed;
    mapping(address => mapping(address => bool)) public userCollateralAssets;
    mapping(address => bool) public supportedCollateralAssets;

    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event ReservesUpdated(uint256 balance);
    event InterestAccrued(uint256 interestAmount);
    event ProtocolFeePaid(uint256 feeAmount);

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
        require(address(asset()) == address(0), "Already initialized");
        require(_asset != address(0), "Invalid asset");
        require(_priceOracle != address(0), "Invalid oracle");
        require(_interestRateModel != address(0), "Invalid rate model");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_collateralFactorBps <= BIPS, "Invalid collateral factor");
        require(_reserveFactorBps <= BIPS, "Invalid reserve factor");
        
        _initializeERC4626(IERC20Metadata(_asset));
        _initializeERC20(_name, _symbol);
        _transferOwnership(msg.sender);
        
        collateralFactorBps = _collateralFactorBps;
        reserveFactorBps = _reserveFactorBps;
        priceOracle = _priceOracle;
        interestRateModel = _interestRateModel;
        feeCollector = _feeCollector;
        lastAccrualTimestamp = block.timestamp;
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
            uint256 protocolFeePercentage = FeeCollector(feeCollector).getProtocolFeePercentage();
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

    // Override to account for accrued interest
    function totalAssets() public view override returns (uint256) {
        uint256 cash = IERC20(asset()).balanceOf(address(this));
        return cash + totalBorrowed() - reserveBalance;
    }

    /**
     * @notice Get the total amount borrowed from the pool
     * @return The total borrowed amount
     */
    function totalBorrowed() public view returns (uint256) {
        uint256 cash = IERC20(asset()).balanceOf(address(this));
        uint256 totalBalance = super.totalAssets() + cash; // Adjust for ERC4626
        return totalBalance - cash;
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
        // In a more complex system, you'd loop through all approved collateral assets
        uint256 shares = balanceOf(user);
        return convertToAssets(shares);
    }

    /**
     * @notice Deposit assets into the lending pool
     * @param assets The amount of assets to deposit
     * @param receiver The receiver of the vault shares
     * @return shares The amount of shares minted
     */
    function deposit(
        uint256 assets,
        address receiver
    ) public override nonReentrant returns (uint256 shares) {
        accrueInterest();
        shares = super.deposit(assets, receiver);
        emit Deposit(receiver, assets);
    }

    /**
     * @notice Withdraw assets from the lending pool
     * @param assets The amount of assets to withdraw
     * @param receiver The receiver of the assets
     * @param owner The owner of the shares
     * @return shares The amount of shares burned
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256 shares) {
        accrueInterest();
        
        // We need to check that this withdrawal doesn't bring the user's health factor below 1
        if (borrowed[owner] > 0) {
            uint256 sharesBurned = previewWithdraw(assets);
            uint256 remainingShares = balanceOf(owner) - sharesBurned;
            uint256 remainingCollateral = convertToAssets(remainingShares);
            uint256 borrowLimit = (remainingCollateral * collateralFactorBps) / BIPS;
            
            require(borrowLimit >= borrowed[owner], "Withdrawal would cause undercollateralization");
        }
        
        shares = super.withdraw(assets, receiver, owner);
        emit Withdraw(owner, assets);
    }

    /**
     * @notice Borrow assets from the lending pool
     * @param amount The amount to borrow
     */
    function borrow(uint256 amount) external nonReentrant {
        accrueInterest();
        
        // Check if the pool has enough liquidity
        uint256 cash = IERC20(asset()).balanceOf(address(this));
        require(cash >= amount, "Insufficient liquidity");
        
        // Update borrower's debt
        borrowed[msg.sender] += amount;
        
        // Check if the borrower's position remains healthy
        require(healthFactor(msg.sender) >= BIPS, "Unhealthy position");
        
        // Transfer funds to borrower
        IERC20(asset()).safeTransfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }

    /**
     * @notice Repay borrowed assets
     * @param amount The amount to repay
     */
    function repay(uint256 amount) external nonReentrant {
        accrueInterest();
        
        require(borrowed[msg.sender] > 0, "No debt to repay");
        
        uint256 repayAmount = amount;
        if (repayAmount > borrowed[msg.sender]) {
            repayAmount = borrowed[msg.sender];
        }
        
        // Transfer funds from repayer
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), repayAmount);
        
        // Update borrower's debt
        borrowed[msg.sender] -= repayAmount;
        
        emit Repay(msg.sender, repayAmount);
    }

    /**
     * @notice Set the collateral factor
     * @param _collateralFactorBps The new collateral factor in basis points
     */
    function setCollateralFactor(uint256 _collateralFactorBps) external onlyOwner {
        require(_collateralFactorBps <= BIPS, "Invalid collateral factor");
        collateralFactorBps = _collateralFactorBps;
    }

    /**
     * @notice Set the reserve factor
     * @param _reserveFactorBps The new reserve factor in basis points
     */
    function setReserveFactor(uint256 _reserveFactorBps) external onlyOwner {
        require(_reserveFactorBps <= BIPS, "Invalid reserve factor");
        reserveFactorBps = _reserveFactorBps;
    }

    /**
     * @notice Set the price oracle
     * @param _priceOracle The new price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid oracle address");
        priceOracle = _priceOracle;
    }

    /**
     * @notice Set the interest rate model
     * @param _interestRateModel The new interest rate model address
     */
    function setInterestRateModel(address _interestRateModel) external onlyOwner {
        require(_interestRateModel != address(0), "Invalid model address");
        interestRateModel = _interestRateModel;
    }
} 