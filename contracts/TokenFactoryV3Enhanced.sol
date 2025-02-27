// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

// Interface for Uniswap V2 Router
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    
    function WETH() external pure returns (address);
}

// Interface for Uniswap V2 Factory
interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

contract TokenTemplateV3Enhanced is ERC20, Ownable {
    uint256 public maxSupply;
    bool public transferable;

    constructor() ERC20("", "") Ownable(msg.sender) {
        transferable = true;
    }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _maxSupply,
        address owner
    ) external {
        require(totalSupply() == 0, "Already initialized");
        _mint(owner, initialSupply);
        maxSupply = _maxSupply;
        _transferOwnership(owner);
        _update(address(0), owner, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        require(transferable || from == address(0) || to == address(0), "Transfers are disabled");
        super._update(from, to, value);
    }

    function setTransferable(bool _transferable) external onlyOwner {
        transferable = _transferable;
    }
}

contract TokenFactoryV3Enhanced {
    address public immutable tokenImplementation;
    address public immutable uniswapV2Router;
    address public immutable uniswapV2Factory;
    mapping(address => address[]) public createdTokens;
    
    event TokenCreated(address indexed token, string name, string symbol, address indexed owner);
    event LiquidityAdded(address indexed token, uint256 tokenAmount, uint256 ethAmount);

    constructor(address _uniswapV2Router, address _uniswapV2Factory) {
        tokenImplementation = address(new TokenTemplateV3Enhanced());
        uniswapV2Router = _uniswapV2Router;
        uniswapV2Factory = _uniswapV2Factory;
    }

    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply
    ) external returns (address) {
        address clone = Clones.clone(tokenImplementation);
        TokenTemplateV3Enhanced(clone).initialize(
            name,
            symbol,
            initialSupply,
            maxSupply,
            msg.sender
        );
        createdTokens[msg.sender].push(clone);
        emit TokenCreated(clone, name, symbol, msg.sender);
        return clone;
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        require(msg.value >= amountETHMin, "Insufficient ETH");
        
        // Transfer tokens from sender to this contract
        TokenTemplateV3Enhanced(token).transferFrom(msg.sender, address(this), amountTokenDesired);
        
        // Approve router to spend tokens
        TokenTemplateV3Enhanced(token).approve(uniswapV2Router, amountTokenDesired);
        
        // Add liquidity through Uniswap router
        (amountToken, amountETH, liquidity) = IUniswapV2Router02(uniswapV2Router).addLiquidityETH{value: msg.value}(
            token,
            amountTokenDesired,
            amountTokenMin,
            amountETHMin,
            msg.sender,  // LP tokens go directly to sender
            deadline
        );
        
        // Refund any unused tokens
        if (amountToken < amountTokenDesired) {
            TokenTemplateV3Enhanced(token).transfer(
                msg.sender,
                amountTokenDesired - amountToken
            );
        }
        
        // Refund any unused ETH
        if (amountETH < msg.value) {
            (bool success, ) = msg.sender.call{value: msg.value - amountETH}("");
            require(success, "ETH refund failed");
        }
        
        emit LiquidityAdded(token, amountToken, amountETH);
    }

    function getCreatedTokens(address owner) external view returns (address[] memory) {
        return createdTokens[owner];
    }

    // Allow contract to receive ETH
    receive() external payable {}
} 