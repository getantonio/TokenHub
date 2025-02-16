// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Simple test token contract with fee distribution
contract TestToken is ERC20 {
    uint256 public marketingFeePercent;
    uint256 public developmentFeePercent;
    uint256 public autoLiquidityFeePercent;
    address public marketingWallet;
    address public developmentWallet;
    address public owner;
    bool public enableBuyFees;
    bool public enableSellFees;

    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 _marketingFeePercent,
        uint256 _developmentFeePercent,
        uint256 _autoLiquidityFeePercent,
        address _marketingWallet,
        address _developmentWallet,
        address _owner,
        bool _enableBuyFees,
        bool _enableSellFees
    ) ERC20(name, symbol) {
        require(_marketingFeePercent + _developmentFeePercent + _autoLiquidityFeePercent <= 25, "Total fees too high");
        require(_marketingWallet != address(0), "Invalid marketing wallet");
        require(_developmentWallet != address(0), "Invalid development wallet");
        
        _mint(_owner, totalSupply);
        marketingFeePercent = _marketingFeePercent;
        developmentFeePercent = _developmentFeePercent;
        autoLiquidityFeePercent = _autoLiquidityFeePercent;
        marketingWallet = _marketingWallet;
        developmentWallet = _developmentWallet;
        owner = _owner;
        enableBuyFees = _enableBuyFees;
        enableSellFees = _enableSellFees;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Skip fees for special cases
        if (from == owner || to == owner || from == address(0) || to == address(0)) {
            return;
        }

        // Calculate and distribute fees
        if ((from == address(this) && enableBuyFees) || (to == address(this) && enableSellFees)) {
            uint256 marketingFee = (amount * marketingFeePercent) / 100;
            uint256 developmentFee = (amount * developmentFeePercent) / 100;
            uint256 autoLiquidityFee = (amount * autoLiquidityFeePercent) / 100;
            
            if (marketingFee > 0) _transfer(from, marketingWallet, marketingFee);
            if (developmentFee > 0) _transfer(from, developmentWallet, developmentFee);
            if (autoLiquidityFee > 0) _transfer(from, address(this), autoLiquidityFee);
        }
    }
}

contract TokenFactory_v2_Make is Ownable {
    uint256 private creationFee;
    mapping(address => address[]) private userTokens;
    address[] private allTokens;

    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 marketingFeePercent,
        uint256 developmentFeePercent,
        uint256 autoLiquidityFeePercent,
        address marketingWallet,
        address developmentWallet,
        bool enableBuyFees,
        bool enableSellFees
    );

    constructor(uint256 _creationFee) {
        creationFee = _creationFee;
        _transferOwnership(msg.sender);
    }

    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 marketingFeePercent,
        uint256 developmentFeePercent,
        uint256 autoLiquidityFeePercent,
        address marketingWallet,
        address developmentWallet,
        bool enableBuyFees,
        bool enableSellFees
    ) external payable returns (address) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        TestToken token = new TestToken(
            name,
            symbol,
            totalSupply,
            marketingFeePercent,
            developmentFeePercent,
            autoLiquidityFeePercent,
            marketingWallet,
            developmentWallet,
            msg.sender,
            enableBuyFees,
            enableSellFees
        );

        userTokens[msg.sender].push(address(token));
        allTokens.push(address(token));

        emit TokenCreated(
            address(token),
            name,
            symbol,
            totalSupply,
            marketingFeePercent,
            developmentFeePercent,
            autoLiquidityFeePercent,
            marketingWallet,
            developmentWallet,
            enableBuyFees,
            enableSellFees
        );

        return address(token);
    }

    function getCreationFee() external view returns (uint256) {
        return creationFee;
    }

    function setCreationFee(uint256 _creationFee) external onlyOwner {
        creationFee = _creationFee;
    }

    function getUserTokens(address user) external view returns (address[] memory) {
        return userTokens[user];
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }
} 