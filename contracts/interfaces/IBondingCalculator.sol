// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

interface IBondingCalculator {
    function valuation(address pair, uint256 amount) external view returns (uint256);

    function markdown(address pair) external view returns (uint256);
}
