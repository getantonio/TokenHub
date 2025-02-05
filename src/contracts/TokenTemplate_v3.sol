// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract TokenTemplate_v3 is ERC20, ERC20Burnable, Ownable, Pausable {
    uint256 public maxSupply;
    bool public blacklistEnabled;
    bool public timeLockEnabled;
    bool public presaleEnabled;

    // Presale settings
    uint256 public presalePrice;
    uint256 public presaleStartTime;
    uint256 public presaleEndTime;
    uint256 public presaleMinContribution;
    uint256 public presaleMaxContribution;
    uint256 public totalPresaleContribution;
    mapping(address => uint256) public presaleContributions;

    // Vesting and distribution
    struct VestingSchedule {
        uint256 amount;
        uint256 releaseTime;
        uint256 released;
        bool initialized;
    }

    mapping(address => VestingSchedule[]) public vestingSchedules;
    mapping(address => bool) public blacklisted;
    mapping(address => uint256) public timeLocks;

    event TokensVested(address indexed beneficiary, uint256 amount);
    event PresaleContribution(address indexed contributor, uint256 amount);
    event PresaleFinalized(uint256 totalRaised);
    event BlacklistUpdated(address indexed account, bool blacklisted);
    event TimeLockUpdated(address indexed account, uint256 unlockTime);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _maxSupply,
        bool _blacklistEnabled,
        bool _timeLockEnabled,
        bool _presaleEnabled,
        uint256 _presalePrice,
        uint256 _presaleStartTime,
        uint256 _presaleEndTime,
        uint256 _presaleMinContribution,
        uint256 _presaleMaxContribution
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_maxSupply >= initialSupply, "Max supply must be >= initial supply");
        
        maxSupply = _maxSupply;
        blacklistEnabled = _blacklistEnabled;
        timeLockEnabled = _timeLockEnabled;
        presaleEnabled = _presaleEnabled;
        
        if (presaleEnabled) {
            presalePrice = _presalePrice;
            presaleStartTime = _presaleStartTime;
            presaleEndTime = _presaleEndTime;
            presaleMinContribution = _presaleMinContribution;
            presaleMaxContribution = _presaleMaxContribution;
        }

        _mint(msg.sender, initialSupply);
    }

    // Presale functions
    function contributeToPresale() external payable whenNotPaused {
        require(presaleEnabled, "Presale is not enabled");
        require(block.timestamp >= presaleStartTime, "Presale has not started");
        require(block.timestamp <= presaleEndTime, "Presale has ended");
        require(msg.value >= presaleMinContribution, "Below minimum contribution");
        require(msg.value <= presaleMaxContribution, "Above maximum contribution");
        require(presaleContributions[msg.sender] + msg.value <= presaleMaxContribution, "Would exceed max contribution");

        uint256 tokenAmount = (msg.value * 10**decimals()) / presalePrice;
        require(totalSupply() + tokenAmount <= maxSupply, "Would exceed max supply");

        presaleContributions[msg.sender] += msg.value;
        totalPresaleContribution += msg.value;
        _mint(msg.sender, tokenAmount);

        emit PresaleContribution(msg.sender, msg.value);
    }

    function finalizePresale() external onlyOwner {
        require(presaleEnabled, "Presale is not enabled");
        require(block.timestamp > presaleEndTime, "Presale has not ended");
        
        presaleEnabled = false;
        emit PresaleFinalized(totalPresaleContribution);
        
        // Transfer collected ETH to owner
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    // Vesting functions
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 vestingPeriod
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(totalSupply() + amount <= maxSupply, "Would exceed max supply");

        uint256 releaseTime = block.timestamp + vestingPeriod;
        vestingSchedules[beneficiary].push(VestingSchedule({
            amount: amount,
            releaseTime: releaseTime,
            released: 0,
            initialized: true
        }));

        _mint(address(this), amount);
    }

    function releaseVestedTokens(address beneficiary) external {
        VestingSchedule[] storage schedules = vestingSchedules[beneficiary];
        uint256 totalRelease = 0;

        for (uint256 i = 0; i < schedules.length; i++) {
            VestingSchedule storage schedule = schedules[i];
            if (schedule.initialized && block.timestamp >= schedule.releaseTime && schedule.released < schedule.amount) {
                uint256 unreleased = schedule.amount - schedule.released;
                schedule.released = schedule.amount;
                totalRelease += unreleased;
            }
        }

        require(totalRelease > 0, "No tokens to release");
        _transfer(address(this), beneficiary, totalRelease);
        emit TokensVested(beneficiary, totalRelease);
    }

    // Blacklist functions
    function setBlacklist(address account, bool status) external onlyOwner {
        require(blacklistEnabled, "Blacklist not enabled");
        blacklisted[account] = status;
        emit BlacklistUpdated(account, status);
    }

    // Timelock functions
    function setTimeLock(address account, uint256 unlockTime) external onlyOwner {
        require(timeLockEnabled, "TimeLock not enabled");
        timeLocks[account] = unlockTime;
        emit TimeLockUpdated(account, unlockTime);
    }

    // Override transfer functions to enforce restrictions
    function _update(address from, address to, uint256 value) internal virtual override {
        if (blacklistEnabled) {
            require(!blacklisted[from] && !blacklisted[to], "Address is blacklisted");
        }
        if (timeLockEnabled) {
            if (from != address(0)) { // Exclude minting
                require(block.timestamp >= timeLocks[from], "Tokens are time-locked");
            }
        }
        super._update(from, to, value);
    }

    // Admin functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Would exceed max supply");
        _mint(to, amount);
    }

    // Utility functions
    function getVestingSchedules(address beneficiary) external view returns (VestingSchedule[] memory) {
        return vestingSchedules[beneficiary];
    }

    function getPresaleInfo() external view returns (
        bool enabled,
        uint256 price,
        uint256 startTime,
        uint256 endTime,
        uint256 minContribution,
        uint256 maxContribution,
        uint256 totalContribution
    ) {
        return (
            presaleEnabled,
            presalePrice,
            presaleStartTime,
            presaleEndTime,
            presaleMinContribution,
            presaleMaxContribution,
            totalPresaleContribution
        );
    }

    receive() external payable {
        if (presaleEnabled) {
            contributeToPresale();
        } else {
            revert("Direct payments not accepted");
        }
    }
} 