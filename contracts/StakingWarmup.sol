// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./interfaces/IERC20.sol";
import "./interfaces/IWarmup.sol";

contract TulipStakingWarmup is IWarmup {
    address public immutable staking;
    IERC20 public immutable sTulip;

    constructor(address _staking, address _sTulip) {
        require(_staking != address(0));
        staking = _staking;
        require(_sTulip != address(0));
        sTulip = IERC20(_sTulip);
    }

    function retrieve(address _staker, uint256 _amount) external override {
        require(msg.sender == staking, "NA");
        sTulip.transfer(_staker, _amount);
    }
}
