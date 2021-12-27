// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

interface IWarmup {
    function retrieve(address staker, uint256 amount) external;
}
