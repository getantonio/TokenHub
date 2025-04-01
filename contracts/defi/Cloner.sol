// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title Cloner
 * @notice Helper contract to clone implementations for debugging
 */
contract Cloner {
    using Clones for address;
    
    event Cloned(address indexed original, address indexed cloned);
    
    /**
     * @notice Creates a clone of an implementation contract
     * @param implementation The address of the implementation to clone
     * @return instance The address of the clone
     */
    function clone(address implementation) external returns (address instance) {
        instance = implementation.clone();
        emit Cloned(implementation, instance);
        return instance;
    }
} 