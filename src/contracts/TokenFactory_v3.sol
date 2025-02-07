// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v3.sol";

/**
 * @title TokenFactory_v3
 * @notice Factory contract for creating new token instances with advanced vesting and distribution features
 * @dev Uses ERC1967 proxy pattern for upgradeable token instances
 */
contract TokenFactory_v3 is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    string public constant VERSION = "3.0.0";

    // Debug events
    event DebugValidation(string message, uint256 value);
    event DebugAllocation(string message, uint256 value);
    event DebugInitStep(string step, string message);
    event DebugPresale(
        string message,
        uint256 presaleTokens,
        uint256 presaleRate,
        uint256 requiredCap,
        uint256 providedCap
    );
    event DebugTime(
        string message,
        uint256 currentTime,
        uint256 startTime,
        uint256 endTime
    );

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

    // Liquidity configuration
    uint256 public defaultLiquidityPercentage; // Default percentage of tokens for liquidity
    uint256 public defaultLiquidityLockDuration; // Default lock duration in days
    
    // Array to track all deployed tokens
    address[] public deployedTokens;
    
    // Mapping to track token versions
    mapping(address => string) public tokenVersions;

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
    event LiquidityConfigUpdated(
        uint256 percentage,
        uint256 lockDuration
    );

    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        address indexed owner,
        uint256 startTime,
        uint256 endTime,
        uint256 initialSupply,
        uint256 maxSupply
    );

    // Template implementation
    TokenTemplate_v3 public immutable tokenImplementation;

    constructor(address _implementation) {
        tokenImplementation = TokenTemplate_v3(_implementation);
    }

    function initialize(uint256 _deploymentFee) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        deploymentFee = _deploymentFee;
        defaultLiquidityPercentage = 3000;     // Default 30%
        defaultLiquidityLockDuration = 180;    // Default 180 days
        
        emit DeploymentFeeUpdated(_deploymentFee);
        emit LiquidityConfigUpdated(
            defaultLiquidityPercentage,
            defaultLiquidityLockDuration
        );
    }

    /**
     * @notice Creates a new token instance with advanced vesting and distribution features
     */
    function createToken(
        TokenCreationParams calldata params
    ) external payable nonReentrant returns (address) {
        // Check deployment fee
        uint256 fee = getDeploymentFee(msg.sender);
        emit DebugValidation("Checking deployment fee", fee);
        require(msg.value >= fee, "Insufficient deployment fee");

        // Validate parameters
        emit DebugValidation("Checking supplies", params.initialSupply);
        require(params.initialSupply <= params.maxSupply, "Initial > max supply");

        emit DebugValidation("Checking tokens per ETH", params.tokensPerEth);
        require(params.tokensPerEth > 0, "Invalid tokens per ETH");

        // Time validation
        emit DebugTime(
            "Validating time parameters",
            block.timestamp,
            params.startTime,
            params.endTime
        );
        require(params.startTime > block.timestamp, "Start time must be future");
        require(params.endTime > params.startTime, "End time must be after start");

        emit DebugValidation("Checking liquidity percentage", params.liquidityPercentage);
        require(params.liquidityPercentage <= 10000, "Invalid liquidity %");
        
        // Calculate total allocation
        uint256 totalAllocation = 
            params.presalePercentage +
            params.liquidityPercentage +
            params.teamPercentage +
            params.marketingPercentage +
            params.developmentPercentage;
            
        emit DebugAllocation("Calculating total allocation", totalAllocation);
        emit DebugAllocation("Presale", params.presalePercentage);
        emit DebugAllocation("Liquidity", params.liquidityPercentage);
        emit DebugAllocation("Team", params.teamPercentage);
        emit DebugAllocation("Marketing", params.marketingPercentage);
        emit DebugAllocation("Development", params.developmentPercentage);

        require(totalAllocation == 10000, "Allocations must total 100%");

        // Calculate presale tokens
        uint256 presaleTokens = (params.initialSupply * params.presalePercentage) / 10000;
        uint256 requiredPresaleCap = presaleTokens / params.tokensPerEth;
        
        emit DebugPresale(
            "Validating presale parameters",
            presaleTokens,
            params.tokensPerEth,
            requiredPresaleCap,
            params.presaleCap
        );

        require(params.presaleCap >= requiredPresaleCap, "Presale cap too low");

        // Calculate platform fee tokens
        uint256 platformFeeTokens = (params.initialSupply * platformFeePercentage) / 10000;
        emit DebugValidation("Platform fee tokens", platformFeeTokens);

        // Create proxy
        emit DebugInitStep("Creating proxy", "Preparing initialization data");

        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v3.initialize.selector,
            TokenTemplate_v3.InitParams({
                name: params.name,
                symbol: params.symbol,
                initialSupply: params.initialSupply,
                maxSupply: params.maxSupply,
                owner: params.owner == address(0) ? msg.sender : params.owner,
                enableBlacklist: params.enableBlacklist,
                enableTimeLock: params.enableTimeLock,
                tokensPerEth: params.tokensPerEth,
                minContribution: params.minContribution,
                maxContribution: params.maxContribution,
                presaleCap: params.presaleCap,
                startTime: params.startTime,
                endTime: params.endTime,
                liquidityPercentage: params.liquidityPercentage == 0 ? defaultLiquidityPercentage : params.liquidityPercentage,
                liquidityLockDuration: params.liquidityLockDuration == 0 ? defaultLiquidityLockDuration : params.liquidityLockDuration,
                platformFeeRecipient: platformFeeRecipient,
                platformFeeTokens: platformFeeTokens,
                platformFeeVestingEnabled: platformFeeVestingEnabled,
                platformFeeVestingDuration: platformFeeVestingDuration,
                platformFeeCliffDuration: platformFeeCliffDuration,
                teamPercentage: params.teamPercentage,
                marketingPercentage: params.marketingPercentage,
                developmentPercentage: params.developmentPercentage,
                presalePercentage: params.presalePercentage
            })
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(tokenImplementation),
            initData
        );

        address token = address(proxy);
        deployedTokens.push(token);
        tokenVersions[token] = VERSION;

        emit TokenCreated(
            token,
            params.name,
            params.symbol,
            params.owner == address(0) ? msg.sender : params.owner,
            params.startTime,
            params.endTime,
            params.initialSupply,
            params.maxSupply
        );

        return token;
    }

    // Configuration functions
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

    function configureLiquidityDefaults(
        uint256 _percentage,
        uint256 _lockDuration
    ) external onlyOwner {
        require(_percentage <= 10000, "Invalid percentage");
        defaultLiquidityPercentage = _percentage;
        defaultLiquidityLockDuration = _lockDuration;
        
        emit LiquidityConfigUpdated(_percentage, _lockDuration);
    }

    function setPlatformFeePercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 10000, "Fee cannot exceed 100%");
        platformFeePercentage = _percentage;
        emit PlatformFeeUpdated(_percentage);
    }

    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        platformFeeRecipient = _recipient;
        emit PlatformFeeRecipientUpdated(_recipient);
    }

    function setDeploymentFee(uint256 _fee) external onlyOwner {
        deploymentFee = _fee;
        emit DeploymentFeeUpdated(_fee);
    }

    function setCustomDeploymentFee(address _user, uint256 _fee) external onlyOwner {
        customDeploymentFees[_user] = _fee;
        emit CustomDeploymentFeeSet(_user, _fee);
    }

    // View functions
    function getDeploymentFee(address _user) public view returns (uint256) {
        uint256 customFee = customDeploymentFees[_user];
        if (customFee > 0 || (customFee == 0 && customDeploymentFees[_user] != 0)) {
            return customFee;
        }
        return deploymentFee;
    }

    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }

    function getTokenVersion(address token) external view returns (string memory) {
        return tokenVersions[token];
    }

    function getTemplateImplementation() external view returns (address) {
        return address(tokenImplementation);
    }

    // Required by UUPSUpgradeable
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

struct TokenCreationParams {
    string name;
    string symbol;
    uint256 initialSupply;
    uint256 maxSupply;
    address owner;
    bool enableBlacklist;
    bool enableTimeLock;
    uint256 tokensPerEth;
    uint256 minContribution;
    uint256 maxContribution;
    uint256 presaleCap;
    uint256 startTime;
    uint256 endTime;
    uint256 presalePercentage;
    uint256 liquidityPercentage;
    uint256 liquidityLockDuration;
    uint256 teamPercentage;
    uint256 marketingPercentage;
    uint256 developmentPercentage;
} 