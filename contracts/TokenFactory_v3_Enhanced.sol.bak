// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "./TokenTemplate_v3_Enhanced.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TokenFactory_v3_Enhanced is Ownable, ReentrancyGuard {
    // Fee settings
    uint256 public creationFee;
    address public feeRecipient;
    
    // Router address for all created tokens
    address public immutable uniswapV2Router;
    
    // Deployed tokens tracking
    address[] public deployedTokens;
    mapping(address => address[]) public userTokens;
    mapping(address => bool) public isTokenDeployed;
    
    // Events
    event TokenCreated(
        address indexed token,
        address indexed owner,
        string name,
        string symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        uint256 timestamp
    );
    event FeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);
    
    constructor(address _router, uint256 _creationFee, address _feeRecipient) {
        require(_router != address(0), "Invalid router address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        uniswapV2Router = _router;
        creationFee = _creationFee;
        feeRecipient = _feeRecipient;
    }
    
    function createToken(
        TokenTemplate_v3_Enhanced.InitParams calldata params
    ) external payable nonReentrant returns (address) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        // Deploy new token
        TokenTemplate_v3_Enhanced token = new TokenTemplate_v3_Enhanced(uniswapV2Router);
        
        // Initialize the token
        token.initialize{value: msg.value - creationFee}(params);
        
        // Track the deployed token
        address tokenAddress = address(token);
        deployedTokens.push(tokenAddress);
        userTokens[msg.sender].push(tokenAddress);
        isTokenDeployed[tokenAddress] = true;
        
        // Transfer creation fee to recipient
        (bool success, ) = feeRecipient.call{value: creationFee}("");
        require(success, "Fee transfer failed");
        
        emit TokenCreated(
            tokenAddress,
            params.owner,
            params.name,
            params.symbol,
            params.initialSupply,
            params.maxSupply,
            block.timestamp
        );
        
        return tokenAddress;
    }
    
    // View functions
    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }
    
    function getUserTokens(address user) external view returns (address[] memory) {
        return userTokens[user];
    }
    
    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }
    
    function getUserTokensCount(address user) external view returns (uint256) {
        return userTokens[user].length;
    }
    
    // Admin functions
    function updateCreationFee(uint256 _newFee) external onlyOwner {
        creationFee = _newFee;
        emit FeeUpdated(_newFee);
    }
    
    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(_newRecipient);
    }
    
    // Emergency functions
    function withdrawStuckTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        IERC20(token).transfer(owner(), amount);
    }
    
    function withdrawStuckETH() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }
    
    receive() external payable {}
} 