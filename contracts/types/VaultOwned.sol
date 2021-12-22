// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./Ownable.sol";

contract VaultOwned is Ownable {
    address internal _vault;

    event VaultTransferred(address indexed newVault);

    function setVault(address vault_) external onlyOwner {
        require(vault_ != address(0), "IA0");
        _vault = vault_;
        emit VaultTransferred(_vault);
    }

    function vault() public view returns (address) {
        return _vault;
    }

    modifier onlyVault() {
        require(_vault == msg.sender, "VaultOwned: caller is not the Vault");
        _;
    }
}
