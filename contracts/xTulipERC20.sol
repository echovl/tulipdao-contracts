// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./interfaces/IERC20.sol";
import "./interfaces/IStaking.sol";

import "./types/ERC20Permit.sol";
import "./types/VaultOwned.sol";

contract xTulipERC20Token is ERC20Permit, Ownable {
    using LowGasSafeMath for uint256;
    IERC20 public tulip;
    IERC20 public sTulip;
    IStaking public staking;

    constructor(
        address _tulip,
        address _sTulip,
        address _staking
    ) ERC20("xTULIP Token", "xTULIP", 9) {
        require(_tulip != address(0));
        tulip = IERC20(_tulip);
        require(_sTulip != address(0));
        sTulip = IERC20(_sTulip);
        require(_staking != address(0));
        staking = IStaking(_staking);
    }

    // Locks Tulip and mints xTulip
    function deposit(uint256 _amount) public {
        // Gets the amount of Tulip locked in the contract
        uint256 totalTulip = sTulip.balanceOf(address(this));
        // Gets the amount of xTulip in existence
        uint256 totalShares = totalSupply();
        // If no xTulip exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalTulip == 0) {
            _mint(msg.sender, _amount);
        }
        // Calculate and mint the amount of xTulip the Tulip is worth. The ratio will change overtime, as xTulip is burned/minted and Tulip deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount.mul(totalShares).div(totalTulip);
            _mint(msg.sender, what);
        }
        // Lock the Tulip in the contract and stake it
        tulip.transferFrom(msg.sender, address(this), _amount);
        tulip.approve(address(staking), _amount);
        staking.stake(_amount, address(this));
        staking.claim(address(this));
    }

    // Unlocks the staked + gained Tulip and burns xTulip
    function withdraw(uint256 _share) public {
        // Gets the amount of xTulip in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of Tulip the xTulip is worth
        uint256 what = _share.mul(sTulip.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        sTulip.approve(address(staking), what);
        staking.unstake(what, false);
        tulip.transfer(msg.sender, what);
    }

    // returns the total amount of TULIP an address has in the contract including fees earned
    function TULIPBalance(address _account) external view returns (uint256) {
        uint256 xTULIPAmount = balanceOf(_account);
        uint256 totalxTULIP = totalSupply();
        return xTULIPAmount.mul(sTulip.balanceOf(address(this))).div(totalxTULIP);
    }

    // returns how much TULIP someone gets for redeeming xTULIP
    function xTULIPForTULIP(uint256 _xTULIPAmount) external view returns (uint256) {
        uint256 totalxTULIP = totalSupply();
        return _xTULIPAmount.mul(sTulip.balanceOf(address(this))).div(totalxTULIP);
    }

    // returns how much xTULIP someone gets for depositing TULIP
    function TULIPForxTULIP(uint256 _tulipAmount) external view returns (uint256) {
        uint256 totalTulip = sTulip.balanceOf(address(this));
        uint256 totalxTULIP = totalSupply();
        if (totalxTULIP == 0 || totalTulip == 0) {
            return _tulipAmount;
        } else {
            return _tulipAmount.mul(totalxTULIP).div(totalTulip);
        }
    }

    function setStaking(address _staking) external onlyOwner {
        require(_staking != address(0));
        staking = IStaking(_staking);
    }
}
