// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BaseToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TokenFactory is Ownable, ReentrancyGuard {
    struct TokenConfig {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 initialSupply;
        uint256 tokenPrice;
        bool transfersEnabled;
        uint256 maxTransferAmount;
        uint256 cooldownTime;
    }

    event TokenCreated(
        address tokenAddress,
        string name,
        string symbol,
        address owner
    );

    mapping(address => bool) public isTokenCreatedHere;
    uint256 public creationFee;

    constructor(uint256 _creationFee) {
        creationFee = _creationFee;
    }

    function createToken(TokenConfig calldata config) 
        external 
        payable 
        nonReentrant 
        returns (address)
    {
        require(msg.value >= creationFee, "Insufficient creation fee");

        BaseToken newToken = new BaseToken(
            config.name,
            config.symbol,
            config.maxSupply,
            config.initialSupply,
            config.tokenPrice
        );

        // Configure token settings
        if (!config.transfersEnabled) {
            newToken.setTransfersEnabled(false);
        }
        if (config.maxTransferAmount > 0) {
            newToken.setMaxTransferAmount(config.maxTransferAmount);
        }
        if (config.cooldownTime > 0) {
            newToken.setCooldownTime(config.cooldownTime);
        }

        // Transfer ownership to creator
        newToken.transferOwnership(msg.sender);
        
        isTokenCreatedHere[address(newToken)] = true;
        
        emit TokenCreated(
            address(newToken),
            config.name,
            config.symbol,
            msg.sender
        );

        return address(newToken);
    }

    function setCreationFee(uint256 _newFee) external onlyOwner {
        creationFee = _newFee;
    }

    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 