// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

interface ITreasury {
    function deposit(
        uint256 amount,
        address token,
        uint256 profit
    ) external returns (uint256);

    function valueOf(address token, uint256 amount) external view returns (uint256 value_);

    function mintRewards(address recipient, uint256 amount) external;
}
