// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period.
 */
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    struct VestingSchedule {
        uint256 totalAmount;      // Total amount of tokens to be vested
        uint256 startTime;        // Start time of the vesting period
        uint256 cliffDuration;    // Duration of the cliff in seconds
        uint256 duration;         // Duration of the vesting in seconds
        uint256 releasedAmount;   // Amount of tokens released
        bool revocable;           // Whether the vesting is revocable
        bool revoked;             // Whether the vesting has been revoked
    }

    // Token being vested
    IERC20 public token;

    // Beneficiary of tokens after they are released
    address public beneficiary;

    // Vesting schedule for the beneficiary
    VestingSchedule public vestingSchedule;

    // Events
    event TokensReleased(uint256 amount);
    event VestingRevoked();

    /**
     * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
     * beneficiary, gradually in a linear fashion until duration has passed.
     * @param _token address of the token being vested
     * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param _startTime start time of the vesting period
     * @param _cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param _duration duration in seconds of the period in which the tokens will vest
     * @param _revocable whether the vesting is revocable or not
     */
    constructor(
        address _token,
        address _beneficiary,
        uint256 _startTime,
        uint256 _cliffDuration,
        uint256 _duration,
        bool _revocable
    ) {
        require(_beneficiary != address(0), "TokenVesting: beneficiary is zero address");
        require(_duration > 0, "TokenVesting: duration is 0");
        require(_duration >= _cliffDuration, "TokenVesting: duration < cliff");

        token = IERC20(_token);
        beneficiary = _beneficiary;
        vestingSchedule = VestingSchedule({
            totalAmount: 0,
            startTime: _startTime,
            cliffDuration: _cliffDuration,
            duration: _duration,
            releasedAmount: 0,
            revocable: _revocable,
            revoked: false
        });
    }

    /**
     * @dev Set the total amount of tokens to be vested
     * @param _amount total amount of tokens to be vested
     */
    function setTotalAmount(uint256 _amount) external onlyOwner {
        require(vestingSchedule.totalAmount == 0, "TokenVesting: total amount already set");
        vestingSchedule.totalAmount = _amount;
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() public nonReentrant {
        uint256 unreleased = releasableAmount();
        require(unreleased > 0, "TokenVesting: no tokens are due");

        vestingSchedule.releasedAmount = vestingSchedule.releasedAmount.add(unreleased);
        token.transfer(beneficiary, unreleased);

        emit TokensReleased(unreleased);
    }

    /**
     * @notice Allows the owner to revoke the vesting. Tokens already vested
     * remain in the contract, the rest are returned to the owner.
     */
    function revoke() public onlyOwner {
        require(vestingSchedule.revocable, "TokenVesting: cannot revoke");
        require(!vestingSchedule.revoked, "TokenVesting: token already revoked");

        uint256 balance = token.balanceOf(address(this));
        uint256 unreleased = releasableAmount();
        uint256 refund = balance.sub(unreleased);

        vestingSchedule.revoked = true;
        token.transfer(owner(), refund);

        emit VestingRevoked();
    }

    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
     */
    function releasableAmount() public view returns (uint256) {
        return vestedAmount().sub(vestingSchedule.releasedAmount);
    }

    /**
     * @dev Calculates the amount that has already vested.
     */
    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < vestingSchedule.startTime.add(vestingSchedule.cliffDuration)) {
            return 0;
        }
        if (block.timestamp >= vestingSchedule.startTime.add(vestingSchedule.duration) || vestingSchedule.revoked) {
            return vestingSchedule.totalAmount;
        }

        return vestingSchedule.totalAmount.mul(
            block.timestamp.sub(vestingSchedule.startTime)
        ).div(vestingSchedule.duration);
    }

    /**
     * @dev Returns the vesting schedule information
     */
    function getVestingSchedule() external view returns (
        uint256 total,
        uint256 released,
        uint256 start,
        uint256 cliff,
        uint256 end,
        bool isRevocable,
        bool isRevoked
    ) {
        return (
            vestingSchedule.totalAmount,
            vestingSchedule.releasedAmount,
            vestingSchedule.startTime,
            vestingSchedule.cliffDuration,
            vestingSchedule.startTime.add(vestingSchedule.duration),
            vestingSchedule.revocable,
            vestingSchedule.revoked
        );
    }
} 