// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RewardToken
 * @notice Token used for liquidity mining rewards
 */
contract RewardToken is ERC20, Ownable {
    // Maximum supply cap
    uint256 public MAX_SUPPLY;
    bool private initialized;
    
    /**
     * @notice Constructor for implementation contract
     */
    constructor() ERC20("", "") {
        // Empty constructor for implementation contract
    }
    
    /**
     * @notice Initialize the token (used with proxy)
     * @param name Token name
     * @param symbol Token symbol
     * @param maxSupply Maximum token supply
     * @param initialSupply Initial token supply to mint to owner
     */
    function initialize(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 initialSupply
    ) external {
        require(!initialized, "Already initialized");
        require(initialSupply <= maxSupply, "Initial supply exceeds max supply");
        
        _initializeERC20(name, symbol);
        MAX_SUPPLY = maxSupply;
        initialized = true;
        
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }
    
    /**
     * @notice Internal function to initialize ERC20 name and symbol
     */
    function _initializeERC20(string memory name, string memory symbol) internal {
        // This is a bit of a hack to set name and symbol since ERC20 doesn't have
        // a built-in initialize function. In practice you might use OpenZeppelin's
        // ERC20Upgradeable contract instead.
        bytes32 nameSlot = 0x7ae4f661958fbecc2f77be6b0eb280d2a6f604c9ca56cca41288c048a0e53b71;
        bytes32 symbolSlot = 0xd9d233e9c410a3aa1c4404a397b61fda8e9c4a528434783e3c13b4a95899a29c;
        
        assembly {
            sstore(nameSlot, name)
            sstore(symbolSlot, symbol)
        }
    }
    
    /**
     * @notice Mint new tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
} 