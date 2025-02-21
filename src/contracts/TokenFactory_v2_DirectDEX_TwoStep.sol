// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "./TokenTemplate_v2DirectDEX.sol";

// Custom errors
error InsufficientETH(uint256 required, uint256 provided);
error DEXNotAvailable(string dexName);
error TokenNotFound(address token);
error TokenAlreadyListed(address token);
error NotTokenOwner(address token, address caller);
error InsufficientTokenAllowance(uint256 required, uint256 provided);
error InvalidTokenAmount(uint256 amount);
error InvalidETHAmount(uint256 amount);
error InvalidListingPrice(uint256 price);
error LiquidityAdditionFailed(address token, uint256 ethAmount, uint256 tokenAmount);
error PairCreationFailed(address token, address router);

contract TokenFactory_v2_DirectDEX_TwoStep is Ownable, ReentrancyGuard {
    string public constant VERSION = "2.2.0";
    bytes32 public constant VERSION_HASH = keccak256(abi.encodePacked(VERSION));

    struct DEXRouter {
        string name;
        address router;
        bool isActive;
    }

    struct TokenCreationParams {
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 maxTxAmount;
        uint256 maxWalletAmount;
        bool enableTrading;
        uint256 tradingStartTime;
        uint256 marketingFeePercentage;
        address marketingWallet;
        uint256 developmentFeePercentage;
        address developmentWallet;
        uint256 autoLiquidityFeePercentage;
        bool enableBuyFees;
        bool enableSellFees;
    }

    struct TokenListingParams {
        address tokenAddress;
        uint256 initialLiquidityInETH;
        uint256 listingPriceInETH;
        string dexName;
        uint256 liquidityPercentage;
    }

    struct TokenInfo {
        address token;
        address owner;
        bool isListed;
        string dexName;
        uint256 creationTime;
        uint256 listingTime;
    }
    
    // DEX management
    mapping(string => DEXRouter) public dexRouters;
    string[] public supportedDEXes;
    
    // Token tracking
    mapping(address => TokenInfo) public tokenInfo;
    address[] public allTokens;
    uint256 public listingFee;
    
    // Events
    event TokenCreated(
        address indexed token,
        address indexed owner,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 creationTime
    );
    
    event TokenListed(
        address indexed token,
        address indexed owner,
        string dexName,
        uint256 initialLiquidity,
        uint256 listingPrice,
        uint256 listingTime
    );
    
    event DEXAdded(string name, address router);
    event DEXUpdated(string name, address router, bool isActive);
    
    constructor(uint256 _listingFee) {
        listingFee = _listingFee;
    }
    
    // Step 1: Create Token
    function createToken(TokenCreationParams calldata params) external nonReentrant returns (address) {
        // Create token
        TokenTemplate_v2DirectDEX token = new TokenTemplate_v2DirectDEX(
            params.name,
            params.symbol,
            params.totalSupply,
            params.maxTxAmount,
            params.maxWalletAmount,
            params.enableTrading,
            params.tradingStartTime,
            address(0), // Router will be set during listing
            params.marketingFeePercentage,
            params.developmentFeePercentage,
            params.autoLiquidityFeePercentage,
            params.marketingWallet,
            params.developmentWallet,
            address(this),
            params.enableBuyFees,
            params.enableSellFees
        );
        
        // Store token info
        tokenInfo[address(token)] = TokenInfo({
            token: address(token),
            owner: msg.sender,
            isListed: false,
            dexName: "",
            creationTime: block.timestamp,
            listingTime: 0
        });
        
        allTokens.push(address(token));
        
        // Transfer ownership to creator
        token.transferOwnership(msg.sender);
        
        emit TokenCreated(
            address(token),
            msg.sender,
            params.name,
            params.symbol,
            params.totalSupply,
            block.timestamp
        );
        
        return address(token);
    }
    
    // Step 2: List Token on DEX
    function listTokenOnDEX(
        address tokenAddress,
        uint256 initialLiquidityInETH,
        uint256 listingPriceInETH,
        string calldata dexName,
        uint256 liquidityPercentage
    ) external payable nonReentrant {
        // Validate token
        TokenInfo storage info = tokenInfo[tokenAddress];
        if (info.token == address(0)) revert TokenNotFound(tokenAddress);
        if (info.isListed) revert TokenAlreadyListed(tokenAddress);
        if (info.owner != msg.sender) revert NotTokenOwner(tokenAddress, msg.sender);
        
        // Store sent ETH value for potential refund
        uint256 sentValue = msg.value;
        
        // Validate ETH amount
        if (sentValue < initialLiquidityInETH + listingFee) {
            revert InsufficientETH(initialLiquidityInETH + listingFee, sentValue);
        }

        // Validate liquidity percentage
        if (liquidityPercentage < 1 || liquidityPercentage > 100) {
            revert("Invalid liquidity percentage");
        }

        // Validate DEX
        if (!dexRouters[dexName].isActive) {
            revert DEXNotAvailable(dexName);
        }
        
        // Get token and router
        TokenTemplate_v2DirectDEX token = TokenTemplate_v2DirectDEX(tokenAddress);
        IUniswapV2Router02 router = IUniswapV2Router02(dexRouters[dexName].router);
        
        // Calculate tokens needed for liquidity
        uint256 tokensForLiquidity = (token.totalSupply() * liquidityPercentage) / 100;
        
        // Check router allowance directly
        uint256 routerAllowance = token.allowance(msg.sender, address(router));
        if (routerAllowance < tokensForLiquidity) {
            revert InsufficientTokenAllowance(tokensForLiquidity, routerAllowance);
        }
        
        // Create pair first
        address uniswapFactory = router.factory();
        address pair;
        try IUniswapV2Factory(uniswapFactory).createPair(
            tokenAddress,
            router.WETH()
        ) returns (address _pair) {
            pair = _pair;
        } catch {
            revert PairCreationFailed(tokenAddress, address(router));
        }
        
        if (pair == address(0)) {
            revert PairCreationFailed(tokenAddress, address(router));
        }
        
        // Set router and pair in token contract
        token.setRouter(address(router));
        token.setPair(pair);
        
        // Calculate minimum amounts with 2% slippage tolerance
        uint256 minTokens = tokensForLiquidity * 98 / 100;
        uint256 minETH = initialLiquidityInETH * 98 / 100;
        
        // Add liquidity directly through router
        try router.addLiquidityETH{value: initialLiquidityInETH}(
            tokenAddress,
            tokensForLiquidity,
            minTokens,
            minETH,
            msg.sender,
            block.timestamp + 300
        ) {
            // Update token info only after successful liquidity addition
            info.isListed = true;
            info.dexName = dexName;
            info.listingTime = block.timestamp;
            
            emit TokenListed(
                tokenAddress,
                msg.sender,
                dexName,
                initialLiquidityInETH,
                listingPriceInETH,
                block.timestamp
            );
            
            // Keep listing fee, refund excess ETH if any
            uint256 excess = sentValue - (initialLiquidityInETH + listingFee);
            if (excess > 0) {
                (bool success, ) = msg.sender.call{value: excess}("");
                require(success, "ETH refund failed");
            }
        } catch {
            // Refund everything except listing fee on failure
            uint256 refundAmount = sentValue - listingFee;
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "Failed to refund ETH");
            
            // Revert with detailed error
            revert LiquidityAdditionFailed(tokenAddress, initialLiquidityInETH, tokensForLiquidity);
        }
    }
    
    // Add refund function for emergency cases
    function emergencyRefund(address tokenAddress) external nonReentrant {
        TokenInfo storage info = tokenInfo[tokenAddress];
        require(info.token == tokenAddress, "Token not found");
        require(info.owner == msg.sender, "Not token owner");
        require(!info.isListed, "Token already listed");
        
        // Calculate refundable amount (everything except listing fee)
        uint256 refundAmount = address(this).balance - listingFee;
        require(refundAmount > 0, "No refund available");
        
        // Send refund
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");
    }
    
    // View functions
    function getListingFee() external view returns (uint256) {
        return listingFee;
    }
    
    function isListed(address token) external view returns (bool) {
        return tokenInfo[token].isListed;
    }
    
    function getSupportedDEXes() external view returns (string[] memory) {
        return supportedDEXes;
    }
    
    function getDEXRouter(string calldata dexName) external view returns (DEXRouter memory) {
        return dexRouters[dexName];
    }

    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return tokenInfo[token];
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    // Admin functions
    function addDEX(string calldata name, address router) external onlyOwner {
        require(dexRouters[name].router == address(0), "DEX already exists");
        
        // Verify router is valid by checking required interfaces
        try IUniswapV2Router02(router).factory() returns (address factory) {
            require(factory != address(0), "Invalid router: no factory");
            try IUniswapV2Router02(router).WETH() returns (address weth) {
                require(weth != address(0), "Invalid router: no WETH");
                // Router is valid, add it
                dexRouters[name] = DEXRouter(name, router, true);
                supportedDEXes.push(name);
                emit DEXAdded(name, router);
            } catch {
                revert("Invalid router: WETH check failed");
            }
        } catch {
            revert("Invalid router: factory check failed");
        }
    }
    
    function updateDEX(string calldata name, address router, bool isActive) external onlyOwner {
        require(dexRouters[name].router != address(0), "DEX not found");
        
        // If updating router address, verify it's valid
        if (router != dexRouters[name].router) {
            try IUniswapV2Router02(router).factory() returns (address factory) {
                require(factory != address(0), "Invalid router: no factory");
                try IUniswapV2Router02(router).WETH() returns (address weth) {
                    require(weth != address(0), "Invalid router: no WETH");
                } catch {
                    revert("Invalid router: WETH check failed");
                }
            } catch {
                revert("Invalid router: factory check failed");
            }
        }
        
        dexRouters[name] = DEXRouter(name, router, isActive);
        emit DEXUpdated(name, router, isActive);
    }
    
    function setListingFee(uint256 _newFee) external onlyOwner {
        listingFee = _newFee;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 