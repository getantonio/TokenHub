// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v1.sol";

contract TokenFactory_v1 is Ownable, ReentrancyGuard {
    string public constant VERSION = "1.0.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));
    
    // Deployment fee
    uint256 public deploymentFee;
    
    // Track all deployed tokens
    address[] private deployedTokens;
    
    // Map deployer address to their tokens
    mapping(address => address[]) private userTokens;
    
    // Map token address to its deployer
    mapping(address => address) private tokenDeployer;

    // Template implementation
    TokenTemplate_v1 public immutable tokenImplementation;
    
    // Events
    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        address indexed owner,
        uint256 initialSupply,
        uint256 maxSupply,
        bool blacklistEnabled,
        bool timeLockEnabled,
        uint256 deploymentTime
    );
    
    event DeploymentFeeUpdated(uint256 newFee);

    constructor(uint256 initialFee) {
        deploymentFee = initialFee;
        emit DeploymentFeeUpdated(initialFee);
        
        // Deploy implementation contract without initializing it
        tokenImplementation = new TokenTemplate_v1();
        // The implementation contract's constructor already calls _disableInitializers()
    }

    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool enableBlacklist,
        bool enableTimeLock
    ) external payable nonReentrant {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");

        // Create initialization data for the proxy
        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v1.initialize.selector,
            name,
            symbol,
            initialSupply,
            maxSupply,
            msg.sender,
            enableBlacklist,
            enableTimeLock
        );

        // Deploy new proxy with initialization data
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(tokenImplementation),
            initData
        );

        // Track the token
        address tokenAddress = address(proxy);
        deployedTokens.push(tokenAddress);
        userTokens[msg.sender].push(tokenAddress);
        tokenDeployer[tokenAddress] = msg.sender;

        emit TokenCreated(
            tokenAddress,
            name,
            symbol,
            msg.sender,
            initialSupply,
            maxSupply,
            enableBlacklist,
            enableTimeLock,
            block.timestamp
        );
    }

    // Get all tokens deployed by a specific user
    function getTokensByUser(address user) external view returns (address[] memory) {
        return userTokens[user];
    }

    // Get all deployed tokens
    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    // Get token deployer
    function getTokenDeployer(address token) external view returns (address) {
        return tokenDeployer[token];
    }

    // Update deployment fee
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }

    // Withdraw collected fees
    function withdrawFees() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
} 