// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./IERC20Mintable.sol";
import "./IERC20.sol";

interface ITulipERC20 is IERC20Mintable, IERC20 {
    function mint(address account, uint256 amount) external override;

    function burn(uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;
}
