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
 * @title TokenTemplate_v2.1.0
 * @dev Template for creating new ERC20 tokens with presale functionality
 * @author TokenFactory
 * @notice Version: 2.1.0
 */
contract TokenTemplate_v2_1_0 is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // Version info
    string public constant VERSION = "2.1.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));

    struct PresaleInfo {
        uint256 softCap;
        uint256 hardCap;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 startTime;
        uint256 endTime;
        uint256 presaleRate; // Tokens per ETH/MATIC
        bool whitelistEnabled;
        bool finalized;
        uint256 totalContributed;
    }

    PresaleInfo public presaleInfo;
    mapping(address => bool) public whitelist;
    mapping(address => uint256) public contributions;
    uint256 public maxSupply;
    bool public blacklistEnabled;
    bool public timeLockEnabled;
    mapping(address => bool) public blacklist;
    mapping(address => uint256) public timeLocks;

    event PresaleStarted(
        uint256 softCap,
        uint256 hardCap,
        uint256 startTime,
        uint256 endTime,
        uint256 presaleRate
    );
    event WhitelistUpdated(address[] addresses, bool status);
    event BlacklistUpdated(address[] addresses, bool status);
    event TimeLockSet(address account, uint256 unlockTime);
    event ContributionReceived(address contributor, uint256 amount);
    event PresaleFinalized(uint256 totalContributed, uint256 tokensDistributed);
    event ContributionRefunded(address contributor, uint256 amount);

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
        bool enableBlacklist_,
        bool enableTimeLock_,
        uint256 presaleRate_,
        uint256 minContribution_,
        uint256 maxContribution_,
        uint256 presaleCap_,
        uint256 startTime_,
        uint256 endTime_
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(owner_);
        __ReentrancyGuard_init();

        require(maxSupply_ >= initialSupply_, "Max supply must be >= initial supply");
        require(startTime_ > block.timestamp, "Start time must be in future");
        require(endTime_ > startTime_, "End time must be after start time");

        maxSupply = maxSupply_;
        blacklistEnabled = enableBlacklist_;
        timeLockEnabled = enableTimeLock_;
        _mint(owner_, initialSupply_);

        presaleInfo = PresaleInfo({
            softCap: presaleCap_ / 2, // Set soft cap to 50% of presale cap
            hardCap: presaleCap_,
            minContribution: minContribution_,
            maxContribution: maxContribution_,
            startTime: startTime_,
            endTime: endTime_,
            presaleRate: presaleRate_,
            whitelistEnabled: false, // Start with whitelist disabled
            finalized: false,
            totalContributed: 0
        });

        emit PresaleStarted(
            presaleInfo.softCap,
            presaleInfo.hardCap,
            startTime_,
            endTime_,
            presaleRate_
        );
    }

    function updateWhitelist(address[] calldata addresses, bool status) external onlyOwner {
        require(presaleInfo.whitelistEnabled, "Whitelist not enabled");
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = status;
        }
        emit WhitelistUpdated(addresses, status);
    }

    function updateBlacklist(address[] calldata addresses, bool status) external onlyOwner {
        require(blacklistEnabled, "Blacklist not enabled");
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklist[addresses[i]] = status;
        }
        emit BlacklistUpdated(addresses, status);
    }

    function setTimeLock(address account, uint256 unlockTime) external onlyOwner {
        require(timeLockEnabled, "Time lock not enabled");
        require(unlockTime > block.timestamp, "Unlock time must be in future");
        timeLocks[account] = unlockTime;
        emit TimeLockSet(account, unlockTime);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) whenNotPaused {
        super._update(from, to, value);

        if (blacklistEnabled) {
            require(!blacklist[from] && !blacklist[to], "Address is blacklisted");
        }

        if (timeLockEnabled && from != address(0)) {
            require(block.timestamp >= timeLocks[from], "Tokens are time-locked");
        }
    }

    function contribute() external payable nonReentrant {
        require(block.timestamp >= presaleInfo.startTime, "Presale not started");
        require(block.timestamp <= presaleInfo.endTime, "Presale ended");
        require(!presaleInfo.finalized, "Presale finalized");
        require(msg.value >= presaleInfo.minContribution, "Below min contribution");
        require(msg.value <= presaleInfo.maxContribution, "Above max contribution");
        require(
            presaleInfo.totalContributed + msg.value <= presaleInfo.hardCap,
            "Hard cap reached"
        );

        if (presaleInfo.whitelistEnabled) {
            require(whitelist[msg.sender], "Not whitelisted");
        }

        uint256 newContribution = contributions[msg.sender] + msg.value;
        require(
            newContribution <= presaleInfo.maxContribution,
            "Would exceed max contribution"
        );

        contributions[msg.sender] = newContribution;
        presaleInfo.totalContributed += msg.value;

        emit ContributionReceived(msg.sender, msg.value);
    }

    function finalize() external onlyOwner nonReentrant {
        require(block.timestamp > presaleInfo.endTime, "Presale not ended");
        require(!presaleInfo.finalized, "Already finalized");
        require(
            presaleInfo.totalContributed >= presaleInfo.softCap,
            "Soft cap not reached"
        );

        presaleInfo.finalized = true;
        uint256 tokensToDistribute = presaleInfo.totalContributed * presaleInfo.presaleRate;

        // Transfer raised funds to owner
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");

        emit PresaleFinalized(presaleInfo.totalContributed, tokensToDistribute);
    }

    function claimRefund() external nonReentrant {
        require(block.timestamp > presaleInfo.endTime, "Presale not ended");
        require(!presaleInfo.finalized, "Presale finalized");
        require(
            presaleInfo.totalContributed < presaleInfo.softCap,
            "Soft cap reached"
        );
        require(contributions[msg.sender] > 0, "No contribution");

        uint256 refundAmount = contributions[msg.sender];
        contributions[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit ContributionRefunded(msg.sender, refundAmount);
    }

    function getPresaleStatus() external view returns (
        uint256 softCap,
        uint256 hardCap,
        uint256 minContribution,
        uint256 maxContribution,
        uint256 startTime,
        uint256 endTime,
        uint256 presaleRate,
        bool whitelistEnabled,
        bool finalized,
        uint256 totalContributed
    ) {
        return (
            presaleInfo.softCap,
            presaleInfo.hardCap,
            presaleInfo.minContribution,
            presaleInfo.maxContribution,
            presaleInfo.startTime,
            presaleInfo.endTime,
            presaleInfo.presaleRate,
            presaleInfo.whitelistEnabled,
            presaleInfo.finalized,
            presaleInfo.totalContributed
        );
    }

    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }

    function isBlacklisted(address account) external view returns (bool) {
        return blacklist[account];
    }

    function getTimeLock(address account) external view returns (uint256) {
        return timeLocks[account];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}