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

contract TokenFactory_v2_Bake is Ownable, ReentrancyGuard {
    string public constant VERSION = "2.0.0";

    struct DEXRouter {
        string name;
        address router;
        bool isActive;
    }

    struct TokenListingParams {
        address tokenAddress;
        uint256 initialLiquidityInETH;
        uint256 listingPriceInETH;
        string dexName;
    }

    struct TokenInfo {
        address token;
        address owner;
        bool isListed;
        string dexName;
        uint256 listingTime;
    }
    
    // DEX management
    mapping(string => DEXRouter) public dexRouters;
    string[] public supportedDEXes;
    
    // Token tracking
    mapping(address => TokenInfo) public tokenInfo;
    address[] public listedTokens;
    uint256 public listingFee;
    
    // Events
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
    
    function listTokenOnDEX(
        address tokenAddress,
        uint256 initialLiquidityInETH,
        uint256 listingPriceInETH,
        string calldata dexName
    ) external payable nonReentrant {
        // Validate token
        TokenInfo storage info = tokenInfo[tokenAddress];
        if (info.isListed) revert TokenAlreadyListed(tokenAddress);
        
        // Validate ETH amount
        if (msg.value < initialLiquidityInETH + listingFee) {
            revert InsufficientETH(initialLiquidityInETH + listingFee, msg.value);
        }

        // Validate DEX
        if (!dexRouters[dexName].isActive) {
            revert DEXNotAvailable(dexName);
        }
        
        // Get token and router
        TokenTemplate_v2DirectDEX token = TokenTemplate_v2DirectDEX(tokenAddress);
        require(token.owner() == msg.sender, "Not token owner");
        
        IUniswapV2Router02 router = IUniswapV2Router02(dexRouters[dexName].router);
        
        // Calculate tokens needed for liquidity (20% of total supply)
        uint256 tokensForLiquidity = (token.totalSupply() * 20) / 100;
        
        // Check allowance
        uint256 allowance = token.allowance(msg.sender, address(this));
        if (allowance < tokensForLiquidity) {
            revert InsufficientTokenAllowance(tokensForLiquidity, allowance);
        }
        
        // Transfer tokens for liquidity
        token.transferFrom(msg.sender, address(this), tokensForLiquidity);
        
        // Create pair
        address uniswapFactory = router.factory();
        address pair = IUniswapV2Factory(uniswapFactory).createPair(
            tokenAddress,
            router.WETH()
        );
        
        if (pair == address(0)) {
            revert PairCreationFailed(tokenAddress, address(router));
        }
        
        // Set router and pair in token
        token.setRouter(address(router));
        token.setPair(pair);
        
        // Approve router
        token.approve(address(router), tokensForLiquidity);
        
        // Add liquidity
        try router.addLiquidityETH{value: initialLiquidityInETH}(
            tokenAddress,
            tokensForLiquidity,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this), // Keep LP tokens in factory
            block.timestamp + 300
        ) {
            // Update token info
            tokenInfo[tokenAddress] = TokenInfo({
                token: tokenAddress,
                owner: msg.sender,
                isListed: true,
                dexName: dexName,
                listingTime: block.timestamp
            });
            
            listedTokens.push(tokenAddress);
            
            emit TokenListed(
                tokenAddress,
                msg.sender,
                dexName,
                initialLiquidityInETH,
                listingPriceInETH,
                block.timestamp
            );
        } catch {
            revert LiquidityAdditionFailed(tokenAddress, initialLiquidityInETH, tokensForLiquidity);
        }
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

    function getListedTokens() external view returns (address[] memory) {
        return listedTokens;
    }
    
    // Admin functions
    function addDEX(string calldata name, address router) external onlyOwner {
        require(dexRouters[name].router == address(0), "DEX already exists");
        dexRouters[name] = DEXRouter(name, router, true);
        supportedDEXes.push(name);
        emit DEXAdded(name, router);
    }
    
    function updateDEX(string calldata name, address router, bool isActive) external onlyOwner {
        require(dexRouters[name].router != address(0), "DEX not found");
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