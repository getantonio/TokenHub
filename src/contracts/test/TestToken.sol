// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract TestToken is ERC20, Ownable, Initializable {
    constructor(string memory name, string memory symbol, uint256 initialSupply) 
        ERC20(name, symbol)
    {}
    
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) external initializer {
        _mint(msg.sender, initialSupply);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
} 