// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "./TokenTemplate_v3.0.0.sol";
import "./TokenGovernor_v3.0.0.sol";
import "./Treasury_v3.0.0.sol";

/**
 * @title TokenFactory_v3.0.0
 * @notice Factory contract for creating new token instances with DAO and governance features
 * @dev Uses ERC1967 proxy pattern for upgradeable token instances and integrates OpenZeppelin Governor
 */
contract TokenFactory_v3_0_0 is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    string public constant VERSION = "3.0.0";

    // Template implementation
    TokenTemplate_v3_0_0 public immutable implementation;

    // Deployment fee configuration
    uint256 public deploymentFee;
    mapping(address => uint256) public customDeploymentFees;
    
    // Array to track all deployed tokens and their DAOs
    address[] public deployedTokens;
    mapping(address => address) public tokenToDAO;
    mapping(address => address) public tokenToTimelock;
    mapping(address => address) public tokenToTreasury;

    // Governance configuration
    struct GovernanceConfig {
        uint256 votingDelay;      // Delay before voting starts in blocks
        uint256 votingPeriod;     // Duration of voting in blocks
        uint256 proposalThreshold; // Minimum tokens required to create proposal
        uint256 quorumNumerator;  // Percentage of total supply required for quorum
        uint256 timelockDelay;    // Timelock delay in seconds
    }

    // Default governance configuration
    GovernanceConfig public defaultConfig;

    // Events
    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        address indexed dao,
        address indexed timelock,
        address treasury
    );
    event DeploymentFeeUpdated(uint256 newFee);
    event CustomDeploymentFeeSet(address indexed user, uint256 fee);
    event GovernanceConfigUpdated(
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumNumerator,
        uint256 timelockDelay
    );

    constructor(address implementation_) {
        implementation = TokenTemplate_v3_0_0(implementation_);
    }

    /**
     * @notice Initializes the factory with default settings
     * @param implementation_ The implementation contract for token clones
     * @param deploymentFee_ The fee required to deploy a new token
     */
    function initialize(
        address implementation_,
        uint256 deploymentFee_
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        
        deploymentFee = deploymentFee_;
        
        // Set default governance configuration
        defaultConfig = GovernanceConfig({
            votingDelay: 1 days,      // 1 day delay before voting starts
            votingPeriod: 7 days,     // 1 week voting period
            proposalThreshold: 100000 * 10**18, // 100,000 tokens
            quorumNumerator: 4,       // 4% quorum
            timelockDelay: 2 days     // 2 day timelock
        });
    }

    /**
     * @notice Creates a new token with DAO and governance features
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param maxSupply Maximum token supply
     * @param governanceConfig Custom governance configuration (optional)
     * @return address The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        GovernanceConfig memory governanceConfig
    ) external payable nonReentrant returns (address) {
        // Check deployment fee
        uint256 fee = customDeploymentFees[msg.sender] > 0 
            ? customDeploymentFees[msg.sender] 
            : deploymentFee;
        require(msg.value >= fee, "Insufficient deployment fee");

        // Deploy token
        bytes memory initData = abi.encodeWithSignature(
            "initialize(string,string,uint256,uint256,address)",
            name,
            symbol,
            initialSupply,
            maxSupply,
            msg.sender
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        address token = address(proxy);

        // Set up governance
        GovernanceConfig memory config = governanceConfig.votingDelay > 0 
            ? governanceConfig 
            : defaultConfig;

        // Deploy timelock
        TimelockController timelock = new TimelockController(
            config.timelockDelay,
            new address[](0),
            new address[](0),
            address(this)
        );

        // Deploy governor
        TokenGovernor_v3_0_0 governor = new TokenGovernor_v3_0_0(
            IVotes(token),
            timelock,
            config.votingDelay,
            config.votingPeriod,
            config.proposalThreshold,
            config.quorumNumerator
        );

        // Deploy treasury
        Treasury_v3_0_0 treasury = new Treasury_v3_0_0(
            address(timelock),
            token
        );

        // Setup roles
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0)); // Anyone can execute
        timelock.revokeRole(timelock.TIMELOCK_ADMIN_ROLE(), address(this));

        // Store deployments
        deployedTokens.push(token);
        tokenToDAO[token] = address(governor);
        tokenToTimelock[token] = address(timelock);
        tokenToTreasury[token] = address(treasury);

        emit TokenCreated(
            token,
            name,
            symbol,
            address(governor),
            address(timelock),
            address(treasury)
        );

        return token;
    }

    /**
     * @notice Updates the default governance configuration
     * @param newConfig New governance configuration
     */
    function updateDefaultGovernanceConfig(GovernanceConfig memory newConfig) external onlyOwner {
        defaultConfig = newConfig;
        emit GovernanceConfigUpdated(
            newConfig.votingDelay,
            newConfig.votingPeriod,
            newConfig.proposalThreshold,
            newConfig.quorumNumerator,
            newConfig.timelockDelay
        );
    }

    /**
     * @notice Sets a custom deployment fee for a specific address
     * @param user Address to set custom fee for
     * @param fee Custom fee amount
     */
    function setCustomDeploymentFee(address user, uint256 fee) external onlyOwner {
        customDeploymentFees[user] = fee;
        emit CustomDeploymentFeeSet(user, fee);
    }

    /**
     * @notice Updates the default deployment fee
     * @param newFee New deployment fee
     */
    function updateDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }

    /**
     * @notice Withdraws accumulated fees to the owner
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }

    /**
     * @notice Gets all tokens deployed by a specific user
     * @param user Address to get tokens for
     * @return address[] Array of token addresses
     */
    function getTokensByUser(address user) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < deployedTokens.length; i++) {
            if (TokenTemplate_v3_0_0(deployedTokens[i]).owner() == user) {
                count++;
            }
        }

        address[] memory userTokens = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < deployedTokens.length; i++) {
            if (TokenTemplate_v3_0_0(deployedTokens[i]).owner() == user) {
                userTokens[index] = deployedTokens[i];
                index++;
            }
        }

        return userTokens;
    }

    /**
     * @notice Gets all deployed tokens
     * @return address[] Array of all deployed token addresses
     */
    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    /**
     * @notice Required by the UUPSUpgradeable module
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 