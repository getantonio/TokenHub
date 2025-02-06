// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v2.sol";

/**
 * @title TokenFactory_v2
 * @notice Factory contract for creating new token instances with presale functionality
 * @dev Uses ERC1967 proxy pattern for upgradeable token instances
 */
contract TokenFactory_v2 is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    string public constant VERSION = "2.0.0";

    // Deployment fee configuration
    uint256 public deploymentFee;
    mapping(address => uint256) public customDeploymentFees;
    
    // Platform fee configuration
    uint256 public platformFeePercentage; // Percentage with 2 decimals (e.g., 500 = 5%)
    address public platformFeeRecipient;
    
    // Platform fee vesting configuration
    uint256 public platformFeeVestingDuration; // Duration in seconds
    uint256 public platformFeeCliffDuration;   // Cliff duration in seconds
    bool public platformFeeVestingEnabled;     // Whether vesting is enabled
    
    // Array to track all deployed tokens
    address[] public deployedTokens;

    // Events
    event DeploymentFeeUpdated(uint256 newFee);
    event CustomDeploymentFeeSet(address indexed user, uint256 fee);
    event PlatformFeeUpdated(uint256 newPercentage);
    event PlatformFeeRecipientUpdated(address newRecipient);
    event PlatformFeeVestingConfigured(
        uint256 vestingDuration,
        uint256 cliffDuration,
        bool enabled
    );

    event TokenCreated(
        address token,
        string name,
        string symbol,
        address owner,
        uint256 startTime,
        uint256 endTime
    );

    // Template implementation
    TokenTemplate_v2 public immutable tokenImplementation;

    constructor(address _implementation) {
        tokenImplementation = TokenTemplate_v2(_implementation);
    }

    function initialize(uint256 _deploymentFee) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        deploymentFee = _deploymentFee;
        platformFeePercentage = 500; // Default 5%
        platformFeeRecipient = owner(); // Default to contract owner
        platformFeeVestingDuration = 365 days; // Default 1 year vesting
        platformFeeCliffDuration = 90 days;    // Default 90 days cliff
        platformFeeVestingEnabled = true;      // Enable vesting by default
        
        emit DeploymentFeeUpdated(_deploymentFee);
        emit PlatformFeeUpdated(platformFeePercentage);
        emit PlatformFeeRecipientUpdated(platformFeeRecipient);
        emit PlatformFeeVestingConfigured(
            platformFeeVestingDuration,
            platformFeeCliffDuration,
            platformFeeVestingEnabled
        );
    }

    /**
     * @notice Configure platform fee vesting parameters
     * @param _vestingDuration Duration of the vesting period in seconds
     * @param _cliffDuration Duration of the cliff period in seconds
     * @param _enabled Whether vesting is enabled
     */
    function configurePlatformFeeVesting(
        uint256 _vestingDuration,
        uint256 _cliffDuration,
        bool _enabled
    ) external onlyOwner {
        require(_cliffDuration <= _vestingDuration, "Cliff longer than vesting");
        platformFeeVestingDuration = _vestingDuration;
        platformFeeCliffDuration = _cliffDuration;
        platformFeeVestingEnabled = _enabled;
        
        emit PlatformFeeVestingConfigured(
            _vestingDuration,
            _cliffDuration,
            _enabled
        );
    }

    /**
     * @notice Set the platform fee percentage
     * @param _percentage New fee percentage with 2 decimals (e.g., 500 = 5%)
     */
    function setPlatformFeePercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 10000, "Fee cannot exceed 100%");
        platformFeePercentage = _percentage;
        emit PlatformFeeUpdated(_percentage);
    }

    /**
     * @notice Set the platform fee recipient
     * @param _recipient Address to receive platform fees
     */
    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        platformFeeRecipient = _recipient;
        emit PlatformFeeRecipientUpdated(_recipient);
    }

    /**
     * @notice Set the default deployment fee
     * @param _fee New deployment fee in wei
     */
    function setDeploymentFee(uint256 _fee) external onlyOwner {
        deploymentFee = _fee;
        emit DeploymentFeeUpdated(_fee);
    }

    /**
     * @notice Set a custom deployment fee for a specific address
     * @param _user Address to set custom fee for
     * @param _fee Custom fee in wei (0 for free deployment)
     */
    function setCustomDeploymentFee(address _user, uint256 _fee) external onlyOwner {
        customDeploymentFees[_user] = _fee;
        emit CustomDeploymentFeeSet(_user, _fee);
    }

    /**
     * @notice Get the deployment fee for a specific address
     * @param _user Address to check
     * @return fee The deployment fee in wei
     */
    function getDeploymentFee(address _user) public view returns (uint256) {
        // Check if user has a custom fee
        uint256 customFee = customDeploymentFees[_user];
        if (customFee > 0 || (customFee == 0 && customDeploymentFees[_user] != 0)) {
            return customFee;
        }
        return deploymentFee;
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
        uint256 endTime
    ) external payable nonReentrant returns (address) {
        // Check deployment fee
        uint256 fee = getDeploymentFee(msg.sender);
        require(msg.value >= fee, "Insufficient deployment fee");

        // Calculate platform fee tokens
        uint256 platformFeeTokens = (initialSupply * platformFeePercentage) / 10000;
        uint256 adjustedInitialSupply = initialSupply - platformFeeTokens;

        // Create proxy
        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v2.initialize.selector,
            TokenTemplate_v2.InitParams({
                name: name,
                symbol: symbol,
                initialSupply: adjustedInitialSupply,
                maxSupply: maxSupply,
                owner: msg.sender,
                enableBlacklist: enableBlacklist,
                enableTimeLock: enableTimeLock,
                presaleRate: presaleRate,
                minContribution: minContribution,
                maxContribution: maxContribution,
                presaleCap: presaleCap,
                startTime: startTime,
                endTime: endTime,
                platformFeeRecipient: platformFeeRecipient,
                platformFeeTokens: platformFeeTokens,
                platformFeeVestingEnabled: platformFeeVestingEnabled,
                platformFeeVestingDuration: platformFeeVestingDuration,
                platformFeeCliffDuration: platformFeeCliffDuration
            })
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(tokenImplementation),
            initData
        );

        address token = address(proxy);
        deployedTokens.push(token);

        emit TokenCreated(
            token,
            name,
            symbol,
            msg.sender,
            startTime,
            endTime
        );

        return token;
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