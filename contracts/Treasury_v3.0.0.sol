// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Treasury_v3.0.0
 * @notice Treasury contract for managing DAO assets
 * @dev Controlled by timelock contract for governance
 */
contract Treasury_v3_0_0 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // The governance token
    IERC20 public immutable governanceToken;

    // Events
    event EtherReceived(address indexed from, uint256 amount);
    event EtherSent(address indexed to, uint256 amount);
    event TokensReceived(address indexed token, address indexed from, uint256 amount);
    event TokensSent(address indexed token, address indexed to, uint256 amount);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    /**
     * @notice Creates a new treasury
     * @param timelock_ Address of the timelock contract that will own this treasury
     * @param governanceToken_ Address of the governance token
     */
    constructor(address timelock_, address governanceToken_) {
        require(timelock_ != address(0), "Timelock cannot be zero address");
        require(governanceToken_ != address(0), "Token cannot be zero address");
        _transferOwnership(timelock_);
        governanceToken = IERC20(governanceToken_);
    }

    /**
     * @notice Allows the treasury to receive ETH
     */
    receive() external payable {
        emit EtherReceived(msg.sender, msg.value);
    }

    /**
     * @notice Sends ETH from treasury
     * @param to Recipient address
     * @param amount Amount of ETH to send
     */
    function sendEther(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Cannot send to zero address");
        require(address(this).balance >= amount, "Insufficient ETH balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit EtherSent(to, amount);
    }

    /**
     * @notice Sends ERC20 tokens from treasury
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount of tokens to send
     */
    function sendTokens(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Cannot send to zero address");
        require(token != address(0), "Token cannot be zero address");
        
        IERC20(token).safeTransfer(to, amount);
        emit TokensSent(token, to, amount);
    }

    /**
     * @notice Allows treasury to receive ERC20 tokens
     * @param token Token address
     * @param from Sender address
     * @param amount Amount of tokens to receive
     */
    function receiveTokens(address token, address from, uint256 amount) external nonReentrant {
        require(token != address(0), "Token cannot be zero address");
        require(from != address(0), "Cannot receive from zero address");
        
        IERC20(token).safeTransferFrom(from, address(this), amount);
        emit TokensReceived(token, from, amount);
    }

    /**
     * @notice Emergency function to withdraw stuck tokens
     * @param token Token address (use address(0) for ETH)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Cannot withdraw to zero address");
        
        if (token == address(0)) {
            require(address(this).balance >= amount, "Insufficient ETH balance");
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        
        emit EmergencyWithdraw(token, to, amount);
    }

    /**
     * @notice Gets the ETH balance of the treasury
     * @return uint256 ETH balance
     */
    function getEtherBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Gets the token balance of the treasury
     * @param token Token address
     * @return uint256 Token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
} 