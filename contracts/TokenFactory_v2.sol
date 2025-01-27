// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v2.sol";

contract TokenFactory_v2 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    address public implementation;
    uint256 public deploymentFee;
    mapping(address => address[]) public deployedTokens;
    mapping(address => bool) public isDeployedToken;

    event TokenDeployed(
        address indexed deployer,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        // Presale parameters
        uint256 softCap,
        uint256 hardCap,
        uint256 minContribution,
        uint256 maxContribution,
        uint256 startTime,
        uint256 endTime,
        uint256 presaleRate,
        bool whitelistEnabled
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address implementation_, uint256 deploymentFee_) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        implementation = implementation_;
        deploymentFee = deploymentFee_;
    }

    function deployToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply,
        // Presale parameters
        uint256 softCap,
        uint256 hardCap,
        uint256 minContribution,
        uint256 maxContribution,
        uint256 startTime,
        uint256 endTime,
        uint256 presaleRate,
        bool whitelistEnabled
    ) external payable returns (address) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");

        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v2.initialize.selector,
            name,
            symbol,
            decimals,
            initialSupply,
            msg.sender, // owner
            softCap,
            hardCap,
            minContribution,
            maxContribution,
            startTime,
            endTime,
            presaleRate,
            whitelistEnabled
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation,
            initData
        );

        address tokenAddress = address(proxy);
        deployedTokens[msg.sender].push(tokenAddress);
        isDeployedToken[tokenAddress] = true;

        emit TokenDeployed(
            msg.sender,
            tokenAddress,
            name,
            symbol,
            decimals,
            initialSupply,
            softCap,
            hardCap,
            minContribution,
            maxContribution,
            startTime,
            endTime,
            presaleRate,
            whitelistEnabled
        );

        return tokenAddress;
    }

    function getDeployedTokens(address deployer) external view returns (address[] memory) {
        return deployedTokens[deployer];
    }

    function updateImplementation(address newImplementation) external onlyOwner {
        implementation = newImplementation;
    }

    function updateDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
    }

    function withdrawFees() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 