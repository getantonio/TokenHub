// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "./TestToken.sol";
import "./TestBeacon.sol";

contract TestFactory {
    TestBeacon public tokenBeacon;
    bytes4 private constant INITIALIZE_SELECTOR = bytes4(keccak256("initialize(string,string,uint256)"));
    
    event TokenCreated(address indexed tokenAddress, string name, string symbol);
    
    constructor() {
        // Deploy implementation
        TestToken implementation = new TestToken("", "", 0);
        
        // Create beacon
        tokenBeacon = new TestBeacon(address(implementation));
    }
    
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) external returns (address) {
        // Encode initialization data
        bytes memory data = abi.encodeWithSelector(
            INITIALIZE_SELECTOR,
            name,
            symbol,
            initialSupply
        );
        
        // Create proxy
        address tokenAddress = tokenBeacon.createProxy(data);
        
        emit TokenCreated(tokenAddress, name, symbol);
        return tokenAddress;
    }
} 