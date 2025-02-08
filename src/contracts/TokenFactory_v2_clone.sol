// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenTemplate_v2_clone.sol";

contract TokenFactory_v2_clone is UUPSUpgradeable, OwnableUpgradeable {
    address public implementation;
    uint256 public deploymentFee;
    address[] public deployedTokens;

    event TokenCreated(address indexed tokenAddress, string name, string symbol);
    event DeploymentFeeUpdated(uint256 newFee);

    function initialize(address _implementation) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        implementation = _implementation;
        deploymentFee = 0.1 ether;
    }

    function createToken(
        TokenTemplate_v2_clone.InitParams calldata params
    ) external payable returns (address) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");

        bytes memory initData = abi.encodeWithSelector(
            TokenTemplate_v2_clone.initialize.selector,
            params
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation,
            initData
        );

        address token = address(proxy);
        deployedTokens.push(token);

        emit TokenCreated(token, params.name, params.symbol);
        return token;
    }

    function setDeploymentFee(uint256 _fee) external onlyOwner {
        deploymentFee = _fee;
        emit DeploymentFeeUpdated(_fee);
    }

    function withdrawFees() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
} 