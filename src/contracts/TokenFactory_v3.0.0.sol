// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v3.0.0.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenFactory_v3.0.0
 * @notice Factory contract for creating new token instances with vesting and distribution features
 * @dev Uses ERC1967 proxy pattern for upgradeable token instances
 */
contract TokenFactory_v3_0_0 is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    string public constant VERSION = "3.0.0";

    // Deployment fee configuration
    uint256 public deploymentFee;
    mapping(address => uint256) public customDeploymentFees;
    
    // Array to track all deployed tokens
    address[] public deployedTokens;
    
    // Mapping to track tokens deployed by specific users
    mapping(address => address[]) public userTokens;
    
    // Events
    event TokenCreated(
        address token,
        string name,
        string symbol,
        address owner,
        uint256[] vestingAmounts,
        uint256[] vestingPeriods,
        address[] beneficiaries
    );
    event DeploymentFeeUpdated(uint256 newFee);
    event CustomDeploymentFeeSet(address indexed user, uint256 fee);

    // Template implementation
    TokenTemplate_v3_0_0 public immutable tokenImplementation;

    constructor(address _implementation) {
        tokenImplementation = TokenTemplate_v3_0_0(_implementation);
    }

    function initialize(uint256 _deploymentFee) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        deploymentFee = _deploymentFee;
        emit DeploymentFeeUpdated(_deploymentFee);
    }

    /**
     * @notice Creates a new token with vesting and distribution configuration
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param maxSupply Maximum token supply
     * @param vestingAmounts Array of vesting amounts for each beneficiary
     * @param vestingPeriods Array of vesting periods in seconds
     * @param beneficiaries Array of beneficiary addresses
     * @return address The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        uint256[] memory vestingAmounts,
        uint256[] memory vestingPeriods,
        address[] memory beneficiaries
    ) external payable nonReentrant returns (address) {
        // Check deployment fee
        uint256 fee = customDeploymentFees[msg.sender] > 0 
            ? customDeploymentFees[msg.sender] 
            : deploymentFee;
        require(msg.value >= fee, "Insufficient deployment fee");

        // Validate arrays have same length
        require(
            vestingAmounts.length == vestingPeriods.length &&
            vestingPeriods.length == beneficiaries.length,
            "Array lengths must match"
        );

        // Validate vesting configuration
        uint256 totalVestingAmount = 0;
        for (uint256 i = 0; i < vestingAmounts.length; i++) {
            require(beneficiaries[i] != address(0), "Invalid beneficiary");
            require(vestingPeriods[i] > 0, "Invalid vesting period");
            totalVestingAmount += vestingAmounts[i];
        }
        require(totalVestingAmount <= maxSupply, "Vesting exceeds max supply");

        // Deploy token
        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v3_0_0.initialize.selector,
            name,
            symbol,
            initialSupply,
            maxSupply,
            msg.sender,
            vestingAmounts,
            vestingPeriods,
            beneficiaries
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(tokenImplementation),
            initData
        );

        address tokenAddress = address(proxy);
        deployedTokens.push(tokenAddress);
        
        // Track the token for this user
        userTokens[msg.sender].push(tokenAddress);

        emit TokenCreated(
            tokenAddress,
            name,
            symbol,
            msg.sender,
            vestingAmounts,
            vestingPeriods,
            beneficiaries
        );

        return tokenAddress;
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
        uint256 customFee = customDeploymentFees[_user];
        if (customFee > 0 || (customFee == 0 && customDeploymentFees[_user] != 0)) {
            return customFee;
        }
        return deploymentFee;
    }

    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Get all deployed tokens
     * @return Array of deployed token addresses
     */
    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    /**
     * @notice Get all tokens deployed by a specific user
     * @param user Address of the user
     * @return Array of token addresses deployed by the user
     */
    function getUserTokens(address user) external view returns (address[] memory) {
        return userTokens[user];
    }

    /**
     * @notice Required by the UUPSUpgradeable module
     */
    function _authorizeUpgrade(address) internal override onlyOwner {}
} 