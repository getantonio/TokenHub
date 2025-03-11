// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestBeacon is Ownable {
    UpgradeableBeacon public beacon;
    
    constructor(address implementation) {
        beacon = new UpgradeableBeacon(implementation);
        beacon.transferOwnership(msg.sender);
    }
    
    function createProxy(bytes memory data) external returns (address) {
        return address(new BeaconProxy(address(beacon), data));
    }
} 