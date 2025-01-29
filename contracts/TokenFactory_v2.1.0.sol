// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v2.1.0.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenFactory_v2.1.0
 * @notice Factory contract for creating new token instances with presale functionality
 * @dev Uses ERC1967 proxy pattern for upgradeable token instances
 */
contract TokenFactory_v2_1_0 is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    string public constant VERSION = "2.1.0";

    // Array to track all deployed tokens
    address[] public deployedTokens;

    // Events
    event TokenCreated(
        address token,
        string name,
        string symbol,
        address owner,
        uint256 startTime,
        uint256 endTime
    );

    // Template implementation
    TokenTemplate_v2_1_0 public immutable tokenImplementation;

    constructor(address _implementation) {
        tokenImplementation = TokenTemplate_v2_1_0(_implementation);
    }

    /**
     * @notice Creates a new token instance with presale configuration
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param maxSupply Maximum token supply
     * @param enableBlacklist Whether to enable blacklist feature
     * @param enableTimeLock Whether to enable time lock feature
     * @param presaleRate Token price in tokens per ETH
     * @param minContribution Minimum contribution in ETH
     * @param maxContribution Maximum contribution in ETH
     * @param presaleCap Maximum ETH to raise in presale
     * @param startTime Presale start time
     * @param endTime Presale end time
     * @param owner Token owner address (optional, defaults to msg.sender)
     * @return address The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool enableBlacklist,
        bool enableTimeLock,
        uint256 presaleRate,
        uint256 minContribution,
        uint256 maxContribution,
        uint256 presaleCap,
        uint256 startTime,
        uint256 endTime,
        address owner
    ) external payable returns (address) {
        require(msg.value >= 0.0001 ether, "Insufficient deployment fee");
        require(startTime > block.timestamp, "Start time must be in future");
        require(endTime > startTime, "End time must be after start time");

        // Set owner to msg.sender if not specified
        if (owner == address(0)) {
            owner = msg.sender;
        }

        // Initialize data
        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v2_1_0.initialize.selector,
            name,
            symbol,
            initialSupply,
            maxSupply,
            owner,
            enableBlacklist,
            enableTimeLock,
            presaleRate,
            minContribution,
            maxContribution,
            presaleCap,
            startTime,
            endTime
        );

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(tokenImplementation),
            initData
        );

        // Track the new token
        address tokenAddress = address(proxy);
        deployedTokens.push(tokenAddress);

        // Emit event
        emit TokenCreated(
            tokenAddress,
            name,
            symbol,
            owner,
            startTime,
            endTime
        );

        return tokenAddress;
    }

    /**
     * @notice Gets the implementation address
     * @return address The address of the implementation contract
     */
    function getTemplateImplementation() external view returns (address) {
        return address(tokenImplementation);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Gets all deployed tokens
     * @return address[] Array of deployed token addresses
     */
    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    /**
     * @notice Withdraw collected fees
     * @dev Only callable by owner
     */
    function withdrawFees() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}