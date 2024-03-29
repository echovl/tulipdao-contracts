// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

interface IStakingHelper {
    function stake(uint256 amount, address recipient) external;
}
