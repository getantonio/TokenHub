// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @notice A simple mock ERC20 token for testing purposes
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;
    
    /**
     * @notice Constructor for MockERC20
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param decimals_ The number of decimals for the token
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) Ownable() {
        _decimals = decimals_;
        _transferOwnership(msg.sender);
    }
    
    /**
     * @notice Get the number of decimals for the token
     * @return The number of decimals
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @notice Mint tokens to an address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens from the caller
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @notice Utility function to mint tokens to multiple addresses
     * @param recipients The addresses to mint tokens to
     * @param amounts The amounts of tokens to mint to each address
     */
    function multiMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
} 