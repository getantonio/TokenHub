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

    struct PresaleInfo {
        uint256 price;           // Price in ETH per token
        uint256 endTime;         // Presale end timestamp
        bool isActive;           // Whether presale is active
        uint256 tokensSold;      // Number of tokens sold in presale
        uint256 presaleAllocation; // Maximum tokens available for presale
    }

    // Mapping from token address to token info
    mapping(address => TokenInfo) public tokens;
    // Mapping from owner to their tokens
    mapping(address => address[]) public userTokens;
    // Mapping from token address to presale info
    mapping(address => PresaleInfo) public presales;

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

    event PresaleStarted(
        address indexed tokenAddress,
        uint256 price,
        uint256 endTime,
        uint256 presaleAllocation
    );

    event TokensPurchased(
        address indexed tokenAddress,
        address indexed buyer,
        uint256 amount,
        uint256 cost
    );

    constructor() Ownable(msg.sender) {
        deploymentFee = 0.0001 ether;
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
        // Owner deploys for free, others pay fee
        if (msg.sender != owner()) {
            require(msg.value >= deploymentFee, "Insufficient deployment fee");
        }
        
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

    /**
     * @dev Starts a simple presale for a token
     * @param tokenAddress The token address
     * @param priceInWei Price per token in Wei
     * @param durationInDays Presale duration in days
     * @param presaleAllocation Amount of tokens available for presale (rest reserved for liquidity)
     */
    function startPresale(
        address tokenAddress,
        uint256 priceInWei,
        uint256 durationInDays,
        uint256 presaleAllocation
    ) public {
        TokenInfo storage tokenInfo = tokens[tokenAddress];
        require(tokenInfo.owner == msg.sender, "Not token owner");
        require(durationInDays > 0 && durationInDays <= 30, "Invalid duration");
        require(priceInWei > 0, "Invalid price");
        require(presaleAllocation > 0 && presaleAllocation < tokenInfo.initialSupply, "Invalid allocation");

        presales[tokenAddress] = PresaleInfo({
            price: priceInWei,
            endTime: block.timestamp + (durationInDays * 1 days),
            isActive: true,
            tokensSold: 0,
            presaleAllocation: presaleAllocation
        });

        emit PresaleStarted(tokenAddress, priceInWei, block.timestamp + (durationInDays * 1 days), presaleAllocation);
    }

    /**
     * @dev Purchases tokens in presale
     */
    function purchaseTokens(address tokenAddress, uint256 tokenAmount) public payable nonReentrant {
        PresaleInfo storage presale = presales[tokenAddress];
        require(presale.isActive, "Presale not active");
        require(block.timestamp <= presale.endTime, "Presale ended");
        require(presale.tokensSold + tokenAmount <= presale.presaleAllocation, "Exceeds presale allocation");

        uint256 cost = tokenAmount * presale.price;
        require(msg.value >= cost, "Insufficient payment");

        // Transfer tokens from owner to buyer
        TokenTemplate_v1 token = TokenTemplate_v1(tokenAddress);
        require(
            token.transferFrom(tokens[tokenAddress].owner, msg.sender, tokenAmount),
            "Transfer failed"
        );

        // Update tokens sold
        presale.tokensSold += tokenAmount;

        emit TokensPurchased(tokenAddress, msg.sender, tokenAmount, cost);

        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    /**
     * @dev Ends presale
     */
    function endPresale(address tokenAddress) public {
        PresaleInfo storage presale = presales[tokenAddress];
        require(tokens[tokenAddress].owner == msg.sender, "Not token owner");
        require(block.timestamp > presale.endTime, "Presale not ended");

        presale.isActive = false;
    }

    /**
     * @dev Gets presale info
     */
    function getPresaleInfo(address tokenAddress) public view returns (
        uint256 price,
        uint256 endTime,
        bool isActive,
        uint256 tokensSold,
        uint256 presaleAllocation,
        uint256 remainingAllocation
    ) {
        PresaleInfo storage presale = presales[tokenAddress];
        return (
            presale.price,
            presale.endTime,
            presale.isActive,
            presale.tokensSold,
            presale.presaleAllocation,
            presale.presaleAllocation - presale.tokensSold
        );
    }
} 