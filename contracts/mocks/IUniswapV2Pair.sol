// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./Token.sol";
import "../interfaces/IERC20.sol";

contract UniswapV2Pair is Token {
    address public _token0;
    address public _token1;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address token0_,
        address token1_
    ) Token(name, symbol, decimals) {
        _token0 = token0_;
        _token1 = token1_;
    }

    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        )
    {
        reserve0 = uint112(IERC20(_token0).balanceOf(address(this)));
        reserve1 = uint112(IERC20(_token1).balanceOf(address(this)));
        blockTimestampLast = uint32(block.timestamp);
    }

    function token0() external view returns (address) {
        return _token0;
    }

    function token1() external view returns (address) {
        return _token1;
    }
}
