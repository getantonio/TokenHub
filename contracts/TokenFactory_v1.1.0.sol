// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v1.1.0.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenFactory_v1.1.0
 * @notice Factory contract for creating new token instances
 * @dev Uses ERC1967 proxy pattern for upgradeable token instances
 */
contract TokenFactory_v1_1_0 is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    string public constant VERSION = "1.1.0";

    // Deployment fee configuration
    uint256 public deploymentFee;
    mapping(address => uint256) public customDeploymentFees;
    
    // Array to track all deployed tokens
    address[] public deployedTokens;

    // Events
    event TokenCreated(address token, string name, string symbol);
    event DeploymentFeeUpdated(uint256 newFee);
    event CustomDeploymentFeeSet(address indexed user, uint256 fee);

    // Template implementation
    TokenTemplate_v1_1_0 public immutable tokenImplementation;

    constructor(address _implementation) {
        tokenImplementation = TokenTemplate_v1_1_0(_implementation);
    }

    function initialize(uint256 _deploymentFee) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        deploymentFee = _deploymentFee;
        emit DeploymentFeeUpdated(_deploymentFee);
    }

    /**
     * @dev Updates the deployment fee
     */
    function setDeploymentFee(uint256 newFee) public onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }

    /**
     * @dev Sets a custom deployment fee for a specific address
     * @param user Address to set custom fee for
     * @param fee Custom fee in wei (0 for free deployment)
     */
    function setCustomDeploymentFee(address user, uint256 fee) external onlyOwner {
        customDeploymentFees[user] = fee;
        emit CustomDeploymentFeeSet(user, fee);
    }

    /**
     * @dev Gets the deployment fee for a specific address
     * @param user Address to check
     * @return fee The deployment fee in wei
     */
    function getDeploymentFee(address user) public view returns (uint256) {
        // Check if user has a custom fee
        uint256 customFee = customDeploymentFees[user];
        if (customFee > 0 || (customFee == 0 && customDeploymentFees[user] != 0)) {
            return customFee;
        }
        return deploymentFee;
    }

    /**
     * @notice Creates a new token instance
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param maxSupply Maximum token supply
     * @param enableBlacklist Whether to enable blacklist feature
     * @param enableTimeLock Whether to enable time lock feature
     * @return address The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool enableBlacklist,
        bool enableTimeLock
    ) external payable nonReentrant returns (address) {
        // Check deployment fee
        uint256 requiredFee = getDeploymentFee(msg.sender);
        require(msg.value >= requiredFee, "Insufficient deployment fee");

        // Initialize data
        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v1_1_0.initialize.selector,
            name,
            symbol,
            initialSupply,
            maxSupply,
            msg.sender,
            enableBlacklist,
            enableTimeLock
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

    /**
     * @notice Withdraw collected fees
     * @dev Only callable by owner
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
    }
}