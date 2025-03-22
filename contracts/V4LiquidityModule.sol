// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "./interfaces/IV4Module.sol";
import "./interfaces/IV4TokenBase.sol";

/**
 * @title V4LiquidityModule
 * @dev Implementation of liquidity module with DEX integration
 */
contract V4LiquidityModule is 
    Initializable, 
    OwnableUpgradeable, 
    IV4Module
{
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    // Token this module is attached to
    address private _token;
    
    // Router (QuickSwap for Polygon Amoy)
    address public constant QUICKSWAP_ROUTER = 0x7E0987E5b3a30e3f2828572Bb659A548460a3003;
    IUniswapV2Router02 public router;
    
    // Liquidity pair tracking
    address public liquidityPair;
    uint256 public liquidityLockDuration;
    
    // Version info
    string public constant VERSION = "4.0.0";
    
    // Events
    event LiquidityAdded(address indexed pair, uint256 tokenAmount, uint256 ethAmount, uint256 liquidity);
    event LiquidityRemoved(address indexed pair, uint256 tokenAmount, uint256 ethAmount);
    event LiquidityLocked(uint256 unlockTime);
    
    /**
     * @dev Constructor that disables initialization on the implementation contract
     */
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the module
     * @param tokenAddress Address of the token this module is attached to
     * @param data Additional initialization data (owner address)
     */
    function initialize(address tokenAddress, bytes calldata data) external override initializer {
        require(data.length == 32, "V4LiquidityModule: invalid initialization data");
        address owner = address(uint160(uint256(bytes32(data))));
        __Ownable_init();
        _transferOwnership(owner);
        
        require(tokenAddress != address(0), "V4LiquidityModule: token address cannot be zero");
        _token = tokenAddress;
        
        // Initialize router
        router = IUniswapV2Router02(QUICKSWAP_ROUTER);
    }
    
    /**
     * @dev Get the type of this module
     * @return moduleType Type identifier for this module
     */
    function getModuleType() external pure override returns (bytes32 moduleType) {
        return keccak256("LIQUIDITY_MODULE");
    }
    
    /**
     * @dev Check if this module has a specific function
     * @param functionSig Function signature to check for
     * @return hasFunction Whether the module implements the function
     */
    function supportsFunction(bytes4 functionSig) external pure override returns (bool hasFunction) {
        return 
            functionSig == this.addLiquidity.selector ||
            functionSig == this.removeLiquidity.selector ||
            functionSig == this.lockLiquidity.selector ||
            functionSig == this.getLPTokenBalance.selector ||
            functionSig == this.getReserves.selector;
    }
    
    /**
     * @dev Get the token this module is attached to
     * @return tokenAddress Address of the token
     */
    function getToken() external view returns (address tokenAddress) {
        return _token;
    }
    
    /**
     * @dev Add liquidity to DEX
     * @param tokenAmount Amount of tokens to add to liquidity
     * @return success Whether liquidity was successfully added
     */
    function addLiquidity(uint256 tokenAmount) external payable onlyOwner returns (bool success) {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(msg.value > 0, "ETH amount must be greater than 0");
        
        // Get token from V4TokenBase
        IV4TokenBase token = IV4TokenBase(_token);
        
        // Approve router to spend tokens
        (bool approveSuccess,) = token.executeFromModule(
            _token, 
            abi.encodeWithSelector(
                IERC20Upgradeable.approve.selector, 
                address(router), 
                tokenAmount
            )
        );
        require(approveSuccess, "Failed to approve router");
        
        // Add liquidity
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = router.addLiquidityETH{value: msg.value}(
            _token,
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        // Get the pair address if not already set
        if (liquidityPair == address(0)) {
            address factory = router.factory();
            liquidityPair = IUniswapV2Factory(factory).getPair(_token, router.WETH());
        }
        
        emit LiquidityAdded(liquidityPair, amountToken, amountETH, liquidity);
        return true;
    }
    
    /**
     * @dev Remove liquidity from DEX
     * @param lpTokenAmount Amount of LP tokens to remove
     * @return success Whether liquidity was successfully removed
     */
    function removeLiquidity(uint256 lpTokenAmount) external onlyOwner returns (bool success) {
        require(liquidityPair != address(0), "No liquidity pair");
        require(block.timestamp >= liquidityLockDuration, "Liquidity is locked");
        require(IERC20Upgradeable(liquidityPair).balanceOf(address(this)) >= lpTokenAmount, "Insufficient LP tokens");
        
        // Approve router to spend LP tokens
        IERC20Upgradeable(liquidityPair).approve(address(router), lpTokenAmount);
        
        // Remove liquidity
        (uint256 amountToken, uint256 amountETH) = router.removeLiquidityETH(
            _token,
            lpTokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            owner(),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        emit LiquidityRemoved(liquidityPair, amountToken, amountETH);
        return true;
    }
    
    /**
     * @dev Lock liquidity for a duration
     * @param duration Duration in seconds to lock liquidity
     * @return success Whether liquidity was successfully locked
     */
    function lockLiquidity(uint256 duration) external onlyOwner returns (bool success) {
        require(duration > 0, "Duration must be greater than 0");
        liquidityLockDuration = block.timestamp + duration;
        emit LiquidityLocked(liquidityLockDuration);
        return true;
    }
    
    /**
     * @dev Get LP token balance
     * @param account Address to check LP token balance for
     * @return balance LP token balance
     */
    function getLPTokenBalance(address account) external view returns (uint256 balance) {
        if (liquidityPair == address(0)) return 0;
        return IERC20Upgradeable(liquidityPair).balanceOf(account);
    }
    
    /**
     * @dev Get reserves from liquidity pair
     * @return tokenReserve Token reserve
     * @return ethReserve ETH reserve
     */
    function getReserves() external view returns (uint256 tokenReserve, uint256 ethReserve) {
        if (liquidityPair == address(0)) return (0, 0);
        
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(liquidityPair).getReserves();
        
        // Check token ordering
        address token0 = IUniswapV2Pair(liquidityPair).token0();
        if (_token == token0) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }
} 