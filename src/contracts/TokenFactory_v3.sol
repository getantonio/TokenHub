// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v3.sol";

contract TokenFactory_v3 is UUPSUpgradeable, OwnableUpgradeable {
    // Contract state variables
    address public implementation;
    uint256 public deploymentFee;
    address[] public deployedTokens;
    
    // Enhanced user token tracking
    mapping(address => address[]) private userCreatedTokens;
    mapping(address => mapping(address => bool)) private isUserToken;
    mapping(address => address) private tokenCreator;
    
    // Fee management
    mapping(address => uint256) public customDeploymentFees;
    
    // Events
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol
    );
    event DeploymentFeeUpdated(uint256 newFee);
    event CustomDeploymentFeeSet(address indexed user, uint256 fee);

    struct WalletAllocation {
        address wallet;
        uint256 percentage;
        bool vestingEnabled;
        uint256 vestingDuration;
        uint256 cliffDuration;
        uint256 vestingStartTime;
    }

    function initialize(address _implementation) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        implementation = _implementation;
        deploymentFee = 0.1 ether;
    }

    function createToken(
        TokenTemplate_v3.InitParams calldata params
    ) external payable returns (address) {
        uint256 userFee = getDeploymentFee(msg.sender);
        require(msg.value >= userFee, "Insufficient deployment fee");

        // Validate token distribution parameters
        require(params.presalePercentage > 0, "Presale percentage must be > 0");
        require(params.liquidityPercentage > 0, "Liquidity percentage must be > 0");
        
        // Calculate total percentage
        uint256 totalPercentage = params.presalePercentage + params.liquidityPercentage;
        
        // Validate wallet allocations if present
        if (params.walletAllocations.length > 0) {
            // Add and validate wallet allocation percentages
            for (uint256 i = 0; i < params.walletAllocations.length; i++) {
                require(params.walletAllocations[i].wallet != address(0), "Wallet address cannot be zero");
                require(params.walletAllocations[i].percentage > 0, "Wallet percentage must be > 0");
                if (params.walletAllocations[i].vestingEnabled) {
                    require(params.walletAllocations[i].vestingDuration > 0, "Vesting duration must be > 0");
                    require(params.walletAllocations[i].vestingStartTime > 0, "Vesting start time must be > 0");
                    require(params.walletAllocations[i].cliffDuration <= params.walletAllocations[i].vestingDuration, 
                        "Cliff cannot be longer than vesting");
                }
                totalPercentage += params.walletAllocations[i].percentage;
            }
        } else {
            // If no additional wallets, presale and liquidity must total 100%
            require(totalPercentage == 100, "Presale and liquidity must total 100% when no additional wallets");
        }

        // Validate total percentage
        require(totalPercentage == 100, "Total percentage must be 100");

        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v3.initialize.selector,
            params
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation,
            initData
        );

        address token = address(proxy);
        
        // Enhanced token tracking
        deployedTokens.push(token);
        userCreatedTokens[msg.sender].push(token);
        isUserToken[msg.sender][token] = true;
        tokenCreator[token] = msg.sender;

        emit TokenCreated(token, msg.sender, params.name, params.symbol);
        return token;
    }

    function getDeploymentFee(address user) public view returns (uint256) {
        uint256 customFee = customDeploymentFees[user];
        if (customFee > 0 || (customFee == 0 && customDeploymentFees[user] != 0)) {
            return customFee;
        }
        return deploymentFee;
    }

    function setDeploymentFee(uint256 _fee) external onlyOwner {
        deploymentFee = _fee;
        emit DeploymentFeeUpdated(_fee);
    }

    function setCustomDeploymentFee(address user, uint256 fee) external onlyOwner {
        customDeploymentFees[user] = fee;
        emit CustomDeploymentFeeSet(user, fee);
    }

    // Enhanced user token management functions
    function getUserCreatedTokens(address user) external view returns (address[] memory) {
        return userCreatedTokens[user];
    }

    function isTokenCreator(address user, address token) external view returns (bool) {
        return isUserToken[user][token];
    }

    function getTokenCreator(address token) external view returns (address) {
        return tokenCreator[token];
    }

    function getUserTokenCount(address user) external view returns (uint256) {
        return userCreatedTokens[user].length;
    }

    function withdrawFees() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function updateImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "Invalid implementation address");
        implementation = _implementation;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
} 