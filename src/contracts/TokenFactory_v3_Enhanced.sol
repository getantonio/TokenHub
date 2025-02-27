// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "./TokenTemplate_v3_Enhanced.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TokenFactory_v3_Enhanced is Ownable, ReentrancyGuard {
    // Custom errors for better gas efficiency and clearer error messages
    error InvalidInitialSupply(uint256 supplied, uint256 maxAllowed);
    error InvalidMaxSupply(uint256 maxSupply, uint256 initialSupply);
    error InvalidOwnerAddress();
    error InvalidPercentageTotal(uint256 total);
    error InvalidLiquidityPercentage(uint256 percentage);
    error InvalidPresaleConfiguration();
    error InvalidWalletAllocation();
    error InsufficientDeploymentFee(uint256 sent, uint256 required);
    error TokenDeploymentFailed();

    // Fee settings
    uint256 public deploymentFee;
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
    
    // New event for logging token creation attempts
    event TokenCreationAttempt(
        string name,
        string symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        address owner,
        bool enableBlacklist,
        bool enableTimeLock,
        uint256 presaleRate,
        uint256 softCap,
        uint256 hardCap,
        uint256 minContribution,
        uint256 maxContribution,
        uint256 startTime,
        uint256 endTime,
        uint256 presalePercentage,
        uint256 liquidityPercentage,
        uint256 liquidityLockDuration,
        uint256 walletAllocationsCount,
        uint256 maxActivePresales,
        bool presaleEnabled
    );

    // New event for logging token creation failures
    event TokenCreationFailed(string reason);

    // Debug events
    event Debug_ValidationStep(string step, string message);
    event Debug_Parameters(
        uint256 deploymentFeeSent,
        uint256 deploymentFeeRequired,
        uint256 totalPercentage,
        uint256 liquidityPercentage,
        uint256 walletTotalPercentage
    );
    event Debug_WalletAllocation(
        uint256 index,
        address wallet,
        uint256 percentage,
        bool vestingEnabled
    );

    constructor(address _router, uint256 _deploymentFee, address _feeRecipient) {
        require(_router != address(0), "Invalid router address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        uniswapV2Router = _router;
        deploymentFee = _deploymentFee;
        feeRecipient = _feeRecipient;
    }
    
    function createToken(
        TokenTemplate_v3_Enhanced.InitParams calldata params
    ) external payable nonReentrant returns (address) {
        // Debug deployment fee
        emit Debug_ValidationStep("Deployment Fee", string.concat(
            "Sent: ", _toString(msg.value),
            ", Required: ", _toString(deploymentFee)
        ));
        
        // Validate deployment fee
        if (msg.value < deploymentFee) {
            emit Debug_ValidationStep("Error", "Insufficient deployment fee");
            revert InsufficientDeploymentFee(msg.value, deploymentFee);
        }

        emit Debug_ValidationStep("Initial Supply", string.concat(
            "Initial: ", _toString(params.initialSupply),
            ", Max: ", _toString(params.maxSupply)
        ));

        // Validate initial and max supply
        if (params.initialSupply == 0) {
            emit Debug_ValidationStep("Error", "Invalid initial supply");
            revert InvalidInitialSupply(params.initialSupply, type(uint256).max);
        }
        if (params.maxSupply < params.initialSupply) {
            emit Debug_ValidationStep("Error", "Max supply less than initial supply");
            revert InvalidMaxSupply(params.maxSupply, params.initialSupply);
        }

        // Validate owner address
        if (params.owner == address(0)) {
            emit Debug_ValidationStep("Error", "Invalid owner address");
            revert InvalidOwnerAddress();
        }

        // Validate percentages
        uint256 totalPercentage = params.liquidityPercentage;
        uint256 walletTotalPercentage = 0;
        
        if (params.presaleEnabled) {
            totalPercentage += params.presalePercentage;
        }
        
        // Calculate total percentage including wallet allocations
        for (uint256 i = 0; i < params.walletAllocations.length; i++) {
            if (params.walletAllocations[i].wallet == address(0)) {
                emit Debug_ValidationStep("Error", string.concat("Invalid wallet address at index ", _toString(i)));
                revert InvalidWalletAllocation();
            }
            walletTotalPercentage += params.walletAllocations[i].percentage;
            totalPercentage += params.walletAllocations[i].percentage;

            emit Debug_WalletAllocation(
                i,
                params.walletAllocations[i].wallet,
                params.walletAllocations[i].percentage,
                params.walletAllocations[i].vestingEnabled
            );
        }

        emit Debug_Parameters(
            msg.value,
            deploymentFee,
            totalPercentage,
            params.liquidityPercentage,
            walletTotalPercentage
        );
        
        if (totalPercentage != 100) {
            emit Debug_ValidationStep("Error", string.concat(
                "Invalid total percentage: ", _toString(totalPercentage),
                "%, Expected: 100%"
            ));
            revert InvalidPercentageTotal(totalPercentage);
        }

        // Validate presale configuration if enabled
        if (params.presaleEnabled) {
            if (
                params.presaleRate == 0 ||
                params.softCap == 0 ||
                params.hardCap == 0 ||
                params.minContribution == 0 ||
                params.maxContribution == 0 ||
                params.startTime <= block.timestamp ||
                params.endTime <= params.startTime
            ) {
                revert InvalidPresaleConfiguration();
            }
        }

        // Log parameters for debugging
        emit TokenCreationAttempt(
            params.name,
            params.symbol,
            params.initialSupply,
            params.maxSupply,
            params.owner,
            params.enableBlacklist,
            params.enableTimeLock,
            params.presaleRate,
            params.softCap,
            params.hardCap,
            params.minContribution,
            params.maxContribution,
            params.startTime,
            params.endTime,
            params.presalePercentage,
            params.liquidityPercentage,
            params.liquidityLockDuration,
            params.walletAllocations.length,
            params.maxActivePresales,
            params.presaleEnabled
        );

        // Deploy token
        TokenTemplate_v3_Enhanced token = new TokenTemplate_v3_Enhanced(uniswapV2Router);
        
        // Initialize token with parameters
        try token.initialize{value: 0}(params) {
            // Track the deployed token
            address tokenAddress = address(token);
            deployedTokens.push(tokenAddress);
            userTokens[msg.sender].push(tokenAddress);
            isTokenDeployed[tokenAddress] = true;
            
            // Transfer deployment fee
            (bool sent, ) = feeRecipient.call{value: msg.value}("");
            require(sent, "Fee transfer failed");
            
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
        } catch Error(string memory reason) {
            emit TokenCreationFailed(reason);
            revert TokenDeploymentFailed();
        }
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
    function updateDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
        emit FeeUpdated(newFee);
    }
    
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
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
    
    receive() external payable {
        revert("Direct deposits not accepted");
    }

    // Helper function to convert uint to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
} 