// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title TokenTemplate_v3.0.0
 * @dev Template for creating new ERC20 tokens with vesting and distribution features
 * @author TokenFactory
 * @notice Version: 3.0.0
 */
contract TokenTemplate_v3_0_0 is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // Version info
    string public constant VERSION = "3.0.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));

    struct VestingSchedule {
        uint256 totalAmount;      // Total amount of tokens to be vested
        uint256 startTime;        // Start time of the vesting period
        uint256 duration;         // Duration of the vesting period in seconds
        uint256 releasedAmount;   // Amount of tokens already released
        bool initialized;         // Whether the vesting schedule is initialized
    }

    // Vesting configuration
    mapping(address => VestingSchedule) public vestingSchedules;
    uint256 public maxSupply;

    // Events
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 refundedAmount);

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        uint256 maxSupply_,
        address owner_,
        uint256[] memory vestingAmounts_,
        uint256[] memory vestingPeriods_,
        address[] memory beneficiaries_
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(owner_);
        __ReentrancyGuard_init();

        require(maxSupply_ >= initialSupply_, "Max supply must be >= initial supply");
        maxSupply = maxSupply_;
        
        // Set up initial vesting schedules
        uint256 totalVestingAmount = 0;
        for (uint256 i = 0; i < beneficiaries_.length; i++) {
            require(beneficiaries_[i] != address(0), "Invalid beneficiary");
            require(vestingPeriods_[i] > 0, "Invalid vesting period");
            require(!vestingSchedules[beneficiaries_[i]].initialized, "Duplicate beneficiary");

            totalVestingAmount += vestingAmounts_[i];
            
            vestingSchedules[beneficiaries_[i]] = VestingSchedule({
                totalAmount: vestingAmounts_[i],
                startTime: block.timestamp,
                duration: vestingPeriods_[i],
                releasedAmount: 0,
                initialized: true
            });

            emit VestingScheduleCreated(
                beneficiaries_[i],
                vestingAmounts_[i],
                block.timestamp,
                vestingPeriods_[i]
            );
        }

        require(totalVestingAmount <= maxSupply_, "Total vesting exceeds max supply");
        
        // Mint initial supply to owner
        _mint(owner_, initialSupply_);
    }

    /**
     * @notice Calculate the amount of tokens that can be released for a beneficiary
     * @param beneficiary The address of the beneficiary
     * @return The amount of releasable tokens
     */
    function calculateReleasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        if (!schedule.initialized || block.timestamp < schedule.startTime) {
            return 0;
        }

        if (block.timestamp >= schedule.startTime + schedule.duration) {
            return schedule.totalAmount - schedule.releasedAmount;
        }

        uint256 timeFromStart = block.timestamp - schedule.startTime;
        uint256 vestedAmount = (schedule.totalAmount * timeFromStart) / schedule.duration;
        return vestedAmount - schedule.releasedAmount;
    }

    /**
     * @notice Release vested tokens for a beneficiary
     * @param beneficiary The address of the beneficiary
     */
    function releaseVestedTokens(address beneficiary) external nonReentrant {
        uint256 releasable = calculateReleasableAmount(beneficiary);
        require(releasable > 0, "No tokens to release");

        vestingSchedules[beneficiary].releasedAmount += releasable;
        _mint(beneficiary, releasable);

        emit TokensReleased(beneficiary, releasable);
    }

    /**
     * @notice Revoke vesting schedule for a beneficiary (only owner)
     * @param beneficiary The address of the beneficiary
     */
    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.initialized, "No vesting schedule");

        uint256 refund = schedule.totalAmount - schedule.releasedAmount;
        schedule.totalAmount = schedule.releasedAmount;
        schedule.duration = 0;

        emit VestingRevoked(beneficiary, refund);
    }

    /**
     * @notice Get vesting schedule details for a beneficiary
     * @param beneficiary The address of the beneficiary
     * @return totalAmount Total amount of tokens to be vested
     * @return startTime Start time of the vesting period
     * @return duration Duration of the vesting period
     * @return releasedAmount Amount of tokens already released
     * @return initialized Whether the vesting schedule exists
     */
    function getVestingSchedule(address beneficiary) external view returns (
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration,
        uint256 releasedAmount,
        bool initialized
    ) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        return (
            schedule.totalAmount,
            schedule.startTime,
            schedule.duration,
            schedule.releasedAmount,
            schedule.initialized
        );
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) whenNotPaused {
        super._update(from, to, value);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
} 