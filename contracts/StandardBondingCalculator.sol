// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./interfaces/IBondingCalculator.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Pair.sol";

import "./libraries/FixedPoint.sol";
import "./libraries/LowGasSafeMath.sol";

contract TulipBondingCalculator is IBondingCalculator {
    using FixedPoint for *;
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for uint112;

    IERC20 public immutable Tulip;

    constructor(address _Tulip) {
        require(_Tulip != address(0));
        Tulip = IERC20(_Tulip);
    }

    function getKValue(address _pair) public view returns (uint256 k_) {
        uint256 token0 = IERC20(IUniswapV2Pair(_pair).token0()).decimals();
        uint256 token1 = IERC20(IUniswapV2Pair(_pair).token1()).decimals();
        uint256 pairDecimals = IERC20(_pair).decimals();

        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(_pair).getReserves();
        if (token0.add(token1) < pairDecimals) {
            uint256 decimals = pairDecimals.sub(token0.add(token1));
            k_ = reserve0.mul(reserve1).mul(10**decimals);
        } else {
            uint256 decimals = token0.add(token1).sub(pairDecimals);
            k_ = reserve0.mul(reserve1).div(10**decimals);
        }
    }

    function getTotalValue(address _pair) public view returns (uint256 _value) {
        _value = getKValue(_pair).sqrrt().mul(2);
    }

    function valuation(address _pair, uint256 amount_) external view override returns (uint256 _value) {
        uint256 totalValue = getTotalValue(_pair);
        uint256 totalSupply = IUniswapV2Pair(_pair).totalSupply();

        _value = totalValue.mul(FixedPoint.fraction(amount_, totalSupply).decode112with18()).div(1e18);
    }

    function markdown(address _pair) external view returns (uint256) {
        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(_pair).getReserves();

        uint256 reserve;
        if (IUniswapV2Pair(_pair).token0() == address(Tulip)) {
            reserve = reserve1;
        } else {
            require(IUniswapV2Pair(_pair).token1() == address(Tulip), "not a Tulip lp pair");
            reserve = reserve0;
        }
        return reserve.mul(2 * (10**Tulip.decimals())).div(getTotalValue(_pair));
    }
}
