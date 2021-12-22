// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "../types/ERC20.sol";

contract Token is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) ERC20(name, symbol, decimals) {}

    function mint(address account_, uint256 amount_) external {
        _mint(account_, amount_);
    }
}
