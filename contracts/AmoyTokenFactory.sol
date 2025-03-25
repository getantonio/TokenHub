// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CustomTinyToken.sol";

/**
 * @title AmoyTokenFactory
 * @dev A simplified token factory for Polygon Amoy network with minimal features
 */
contract AmoyTokenFactory {
    address public owner;
    uint256 public deploymentFee;
    mapping(address => address[]) private tokensByUser;
    mapping(address => bool) public isTokenFromFactory;
    
    event TokenCreated(address indexed tokenAddress, address indexed creator);
    
    constructor(uint256 _deploymentFee) {
        owner = msg.sender;
        deploymentFee = _deploymentFee;
    }
    
    /**
     * @dev Modifier to restrict function access to the contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @dev Create a new token with the specified parameters
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialSupply The initial supply of the token (in whole tokens, not wei)
     * @return The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) external payable returns (address) {
        require(msg.value >= deploymentFee, "Insufficient fee");
        
        // Deploy a new token
        CustomTinyToken token = new CustomTinyToken(
            name,
            symbol,
            initialSupply
        );
        
        // Register token
        address tokenAddress = address(token);
        tokensByUser[msg.sender].push(tokenAddress);
        isTokenFromFactory[tokenAddress] = true;
        
        // Emit event
        emit TokenCreated(tokenAddress, msg.sender);
        
        return tokenAddress;
    }
    
    /**
     * @dev Get all tokens created by a specific user
     * @param user The address of the user
     * @return An array of token addresses created by the user
     */
    function getTokensByUser(address user) external view returns (address[] memory) {
        return tokensByUser[user];
    }
    
    /**
     * @dev Update the deployment fee
     * @param newFee The new deployment fee
     */
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
    }
    
    /**
     * @dev Transfer ownership of the factory
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }
    
    /**
     * @dev Withdraw accumulated fees from the contract
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
} 