// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title IV4LiquidityModule
 * @dev Interface for the V4 liquidity module
 */
interface IV4LiquidityModule {
    /**
     * @dev Add liquidity to DEX
     * @param tokenAmount Amount of tokens to add to liquidity
     * @return success Whether liquidity was successfully added
     */
    function addLiquidity(uint256 tokenAmount) external payable returns (bool success);
    
    /**
     * @dev Remove liquidity from DEX
     * @param lpTokenAmount Amount of LP tokens to remove
     * @return success Whether liquidity was successfully removed
     */
    function removeLiquidity(uint256 lpTokenAmount) external returns (bool success);
    
    /**
     * @dev Lock liquidity for a duration
     * @param duration Duration in seconds to lock liquidity
     * @return success Whether liquidity was successfully locked
     */
    function lockLiquidity(uint256 duration) external returns (bool success);
    
    /**
     * @dev Get LP token balance
     * @param account Address to check LP token balance for
     * @return balance LP token balance
     */
    function getLPTokenBalance(address account) external view returns (uint256 balance);
    
    /**
     * @dev Get reserves from liquidity pair
     * @return tokenReserve Token reserve
     * @return ethReserve ETH reserve
     */
    function getReserves() external view returns (uint256 tokenReserve, uint256 ethReserve);
} 