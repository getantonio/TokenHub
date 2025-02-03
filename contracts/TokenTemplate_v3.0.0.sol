// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

/**
 * @title TokenTemplate_v3.0.0
 * @notice Template for creating governance-enabled ERC20 tokens with advanced features
 * @dev Implements ERC20 with voting, snapshots, and other governance features
 */
contract TokenTemplate_v3_0_0 is 
    Initializable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    ERC20SnapshotUpgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    // Token configuration
    uint256 public maxSupply;
    bool public transfersLocked;

    // Governance features
    mapping(address => bool) public isGovernor;
    mapping(address => bool) public isExecutor;
    mapping(address => bool) public blacklisted;
    mapping(address => uint256) public lockTime;

    // Events
    event GovernorAdded(address indexed governor);
    event GovernorRemoved(address indexed governor);
    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);
    event AddressBlacklisted(address indexed account);
    event AddressUnblacklisted(address indexed account);
    event TransfersLocked(bool locked);
    event LockTimeSet(address indexed account, uint256 until);
    event SnapshotCreated(uint256 id);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the token with basic settings
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param initialSupply_ Initial token supply
     * @param maxSupply_ Maximum token supply
     * @param owner_ Token owner address
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        uint256 maxSupply_,
        address owner_
    ) public initializer {
        require(maxSupply_ >= initialSupply_, "Max supply must be >= initial supply");
        require(owner_ != address(0), "Owner cannot be zero address");

        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __ERC20Votes_init();
        __ERC20Permit_init(name_);
        __ERC20Snapshot_init();
        __Ownable_init();
        __UUPSUpgradeable_init();

        maxSupply = maxSupply_;
        transfersLocked = false;

        if (initialSupply_ > 0) {
            _mint(owner_, initialSupply_);
        }

        _transferOwnership(owner_);
    }

    // Governance functions

    /**
     * @notice Adds a governor address
     * @param governor Address to add as governor
     */
    function addGovernor(address governor) external onlyOwner {
        require(governor != address(0), "Governor cannot be zero address");
        isGovernor[governor] = true;
        emit GovernorAdded(governor);
    }

    /**
     * @notice Removes a governor address
     * @param governor Address to remove as governor
     */
    function removeGovernor(address governor) external onlyOwner {
        isGovernor[governor] = false;
        emit GovernorRemoved(governor);
    }

    /**
     * @notice Adds an executor address
     * @param executor Address to add as executor
     */
    function addExecutor(address executor) external onlyOwner {
        require(executor != address(0), "Executor cannot be zero address");
        isExecutor[executor] = true;
        emit ExecutorAdded(executor);
    }

    /**
     * @notice Removes an executor address
     * @param executor Address to remove as executor
     */
    function removeExecutor(address executor) external onlyOwner {
        isExecutor[executor] = false;
        emit ExecutorRemoved(executor);
    }

    /**
     * @notice Blacklists an address
     * @param account Address to blacklist
     */
    function blacklist(address account) external {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        blacklisted[account] = true;
        emit AddressBlacklisted(account);
    }

    /**
     * @notice Removes an address from blacklist
     * @param account Address to unblacklist
     */
    function unblacklist(address account) external {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        blacklisted[account] = false;
        emit AddressUnblacklisted(account);
    }

    /**
     * @notice Sets a lock time for an address
     * @param account Address to lock
     * @param until Timestamp until which the address is locked
     */
    function setLockTime(address account, uint256 until) external {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        require(until > block.timestamp, "Lock time must be in future");
        lockTime[account] = until;
        emit LockTimeSet(account, until);
    }

    /**
     * @notice Creates a new snapshot of token balances
     * @return uint256 ID of the snapshot
     */
    function snapshot() external returns (uint256) {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        uint256 id = _snapshot();
        emit SnapshotCreated(id);
        return id;
    }

    /**
     * @notice Toggles transfer lock status
     * @param locked New lock status
     */
    function setTransfersLocked(bool locked) external {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        transfersLocked = locked;
        emit TransfersLocked(locked);
    }

    /**
     * @notice Mints new tokens
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        require(totalSupply() + amount <= maxSupply, "Would exceed max supply");
        _mint(to, amount);
    }

    /**
     * @notice Pauses all token transfers
     */
    function pause() external {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        _pause();
    }

    /**
     * @notice Unpauses all token transfers
     */
    function unpause() external {
        require(isGovernor[msg.sender] || owner() == msg.sender, "Not authorized");
        _unpause();
    }

    // Override functions

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(
        ERC20Upgradeable,
        ERC20PausableUpgradeable,
        ERC20SnapshotUpgradeable
    ) {
        require(!transfersLocked, "Transfers are locked");
        require(!blacklisted[from] && !blacklisted[to], "Address is blacklisted");
        require(
            lockTime[from] < block.timestamp,
            "Sender is temporarily locked"
        );
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Upgradeable, ERC20VotesUpgradeable) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal virtual override(
        ERC20Upgradeable,
        ERC20VotesUpgradeable
    ) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal virtual override(
        ERC20Upgradeable,
        ERC20VotesUpgradeable
    ) {
        super._burn(account, amount);
    }

    /**
     * @notice Required by the UUPSUpgradeable module
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 