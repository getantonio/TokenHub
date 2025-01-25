// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./TokenTemplate_v1.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title TokenFactory_v1
 * @dev Factory contract for creating new token instances
 * @author TokenFactory
 * @notice Version: 1.0.0
 * 
 * Features:
 * - Creates new token instances with customizable parameters
 * - Tracks all deployed tokens and their metadata
 * - Manages deployment fees
 * - Allows token discovery by owner
 */
contract TokenFactory_v1 is Ownable, ReentrancyGuard {
    // Version info
    string public constant VERSION = "1.0.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));
    
    uint256 public deploymentFee;
    uint256 public tokensCreated;
    TokenTemplate_v1 public immutable tokenImplementation;
    
    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
        address owner;
        uint256 initialSupply;
        uint256 maxSupply;
        bool blacklistEnabled;
        bool timeLockEnabled;
        uint256 createdAt;
    }

    // Mapping from token address to token info
    mapping(address => TokenInfo) public tokens;
    // Mapping from owner to their tokens
    mapping(address => address[]) public userTokens;

    event TokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        address indexed owner,
        uint256 initialSupply,
        uint256 maxSupply,
        bool blacklistEnabled,
        bool timeLockEnabled
    );

    event DeploymentFeeUpdated(uint256 newFee);

    constructor(uint256 initialFee) Ownable(msg.sender) {
        deploymentFee = initialFee;
        tokenImplementation = new TokenTemplate_v1();
    }

    /**
     * @dev Creates a new token instance
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool enableBlacklist,
        bool enableTimeLock
    ) public payable nonReentrant {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        
        // Deploy new token proxy
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
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(tokenImplementation),
            initData
        );
        address tokenAddress = address(proxy);
        
        // Store token info
        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            owner: msg.sender,
            initialSupply: initialSupply,
            maxSupply: maxSupply,
            blacklistEnabled: enableBlacklist,
            timeLockEnabled: enableTimeLock,
            createdAt: block.timestamp
        });

        // Add to user's tokens
        userTokens[msg.sender].push(tokenAddress);
        tokensCreated++;

        emit TokenCreated(
            tokenAddress,
            name,
            symbol,
            msg.sender,
            initialSupply,
            maxSupply,
            enableBlacklist,
            enableTimeLock
        );
    }

    /**
     * @dev Updates the deployment fee
     */
    function setDeploymentFee(uint256 newFee) public onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }

    /**
     * @dev Withdraws collected fees
     */
    function withdrawFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Gets all tokens created by a user
     */
    function getTokensByUser(address user) public view returns (address[] memory) {
        return userTokens[user];
    }

    /**
     * @dev Gets token info
     */
    function getTokenInfo(address tokenAddress) public view returns (TokenInfo memory) {
        return tokens[tokenAddress];
    }
} 