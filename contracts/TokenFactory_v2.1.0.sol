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
    event TokenCreated(address token, string name, string symbol);

    // Template implementation
    TokenTemplate_v2_1_0 public immutable tokenImplementation;

    constructor(address _implementation) {
        tokenImplementation = TokenTemplate_v2_1_0(_implementation);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    function initialize() initializer public {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    /// @notice Returns the address of the token template implementation
    function templateImplementation() public view returns (address) {
        return address(tokenImplementation);
    }

    /**
     * @notice Creates a new token instance with presale configuration
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param softCap Soft cap for presale in ETH
     * @param hardCap Hard cap for presale in ETH
     * @param minContribution Minimum contribution in ETH
     * @param maxContribution Maximum contribution in ETH
     * @param startTime Presale start time
     * @param endTime Presale end time
     * @param presaleRate Token price in tokens per ETH
     * @param whitelistEnabled Whether to enable whitelist
     * @return address The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 softCap,
        uint256 hardCap,
        uint256 minContribution,
        uint256 maxContribution,
        uint256 startTime,
        uint256 endTime,
        uint256 presaleRate,
        bool whitelistEnabled
    ) external onlyOwner returns (address) {
        // Initialize data
        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v2_1_0.initialize.selector,
            name,
            symbol,
            18, // decimals
            initialSupply,
            msg.sender,
            softCap,
            hardCap,
            minContribution,
            maxContribution,
            startTime,
            endTime,
            presaleRate,
            whitelistEnabled
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
        emit TokenCreated(tokenAddress, name, symbol);

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
} 