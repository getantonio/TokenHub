// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BaseToken is ERC20, Pausable, Ownable, ReentrancyGuard {
    // Token parameters
    uint256 public maxSupply;
    uint256 public tokenPrice;
    bool public transfersEnabled;
    
    // Anti-bot and security
    mapping(address => bool) public blacklisted;
    uint256 public maxTransferAmount;
    uint256 public cooldownTime;
    mapping(address => uint256) public lastTransferTime;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        uint256 _initialSupply,
        uint256 _tokenPrice
    ) ERC20(name, symbol) {
        require(_initialSupply <= _maxSupply, "Initial supply exceeds max supply");
        maxSupply = _maxSupply;
        tokenPrice = _tokenPrice;
        transfersEnabled = true;
        _mint(msg.sender, _initialSupply);
    }

    // Security functions
    function setTransfersEnabled(bool _enabled) external onlyOwner {
        transfersEnabled = _enabled;
    }

    function blacklistAddress(address account, bool status) external onlyOwner {
        blacklisted[account] = status;
    }

    function setMaxTransferAmount(uint256 amount) external onlyOwner {
        maxTransferAmount = amount;
    }

    function setCooldownTime(uint256 time) external onlyOwner {
        cooldownTime = time;
    }

    // Override transfer function with security checks
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        require(transfersEnabled, "Transfers are disabled");
        require(!blacklisted[sender] && !blacklisted[recipient], "Address is blacklisted");
        require(amount <= maxTransferAmount || maxTransferAmount == 0, "Transfer amount exceeds limit");
        
        if (cooldownTime > 0) {
            require(
                lastTransferTime[sender] + cooldownTime <= block.timestamp,
                "Transfer cooldown active"
            );
            lastTransferTime[sender] = block.timestamp;
        }

        super._transfer(sender, recipient, amount);
    }

    // Pause/Unpause
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
} 