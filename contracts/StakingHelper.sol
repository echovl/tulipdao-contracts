// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./interfaces/IERC20.sol";
import "./interfaces/IStakingHelper.sol";
import "./interfaces/IStaking.sol";

contract TulipStakingHelper is IStakingHelper {
    event LogStake(address indexed recipient, uint256 amount);

    IStaking public immutable staking;
    IERC20 public immutable Tulip;

    constructor(address _staking, address _Tulip) {
        require(_staking != address(0));
        staking = IStaking(_staking);
        require(_Tulip != address(0));
        Tulip = IERC20(_Tulip);
    }

    function stake(uint256 _amount, address recipient) external override {
        Tulip.transferFrom(msg.sender, address(this), _amount);
        Tulip.approve(address(staking), _amount);
        staking.stake(_amount, recipient);
        staking.claim(recipient);
        emit LogStake(recipient, _amount);
    }
}
