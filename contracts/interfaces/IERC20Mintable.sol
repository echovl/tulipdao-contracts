// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

interface IERC20Mintable {
    function mint(address account_, uint256 ammount_) external;
}
