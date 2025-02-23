// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TokenTemplate_v3.sol";

contract TokenFactory_v3 is Ownable, ReentrancyGuard {
    string public constant VERSION = "3.0.0";
    
    // Contract state variables
    uint256 public deploymentFee = 0.001 ether; // 0.001 BNB for testnet
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

    constructor() {
        _transferOwnership(msg.sender);
    }

    function createToken(
        TokenTemplate_v3.InitParams calldata params
    ) external payable nonReentrant returns (address) {
        uint256 userFee = getDeploymentFee(msg.sender);
        require(msg.value >= userFee, "Insufficient deployment fee");
        
        // Calculate excess ETH to be used for liquidity
        uint256 liquidityETH = msg.value - userFee;

        // Validate token distribution parameters
        if (params.presaleEnabled) {
            require(params.presalePercentage > 0, "Presale percentage must be > 0");
            require(params.maxActivePresales > 0, "Max active presales must be > 0");
        }
        require(params.liquidityPercentage > 0, "Liquidity percentage must be > 0");
        
        // Calculate total percentage
        uint256 totalPercentage = params.presaleEnabled ? params.presalePercentage : 0;
        totalPercentage += params.liquidityPercentage;
        
        // Validate wallet allocations if present
        if (params.walletAllocations.length > 0) {
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
            require(totalPercentage == 100, "Presale and liquidity must total 100% when no additional wallets");
        }

        require(totalPercentage == 100, "Total percentage must be 100");

        // Deploy new token directly
        TokenTemplate_v3 token = new TokenTemplate_v3();
        token.initialize{value: liquidityETH}(params);  // Forward excess ETH for liquidity
        
        address tokenAddress = address(token);
        
        // Enhanced token tracking
        deployedTokens.push(tokenAddress);
        userCreatedTokens[msg.sender].push(tokenAddress);
        isUserToken[msg.sender][tokenAddress] = true;
        tokenCreator[tokenAddress] = msg.sender;

        emit TokenCreated(tokenAddress, msg.sender, params.name, params.symbol);
        return tokenAddress;
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
} 