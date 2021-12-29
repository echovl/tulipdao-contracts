// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./interfaces/IERC20.sol";
import "./interfaces/IsTulipERC20.sol";
import "./interfaces/IWarmup.sol";
import "./interfaces/IDistributor.sol";
import "./interfaces/IStaking.sol";

import "./libraries/LowGasSafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./types/Ownable.sol";

contract TulipStaking is Ownable, IStaking {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for uint32;
    using SafeERC20 for IERC20;
    using SafeERC20 for IsTulipERC20;

    IERC20 public immutable Tulip;
    IsTulipERC20 public immutable sTulip;

    struct Epoch {
        uint256 number;
        uint256 distribute;
        uint32 length;
        uint32 endTime;
    }
    Epoch public epoch;

    IDistributor public distributor;

    uint256 public totalBonus;

    IWarmup public warmupContract;
    uint256 public warmupPeriod;

    event LogStake(address indexed recipient, uint256 amount);
    event LogClaim(address indexed recipient, uint256 amount);
    event LogForfeit(address indexed recipient, uint256 sTulipAmount, uint256 tulipAmount);
    event LogDepositLock(address indexed user, bool locked);
    event LogUnstake(address indexed recipient, uint256 amount);
    event LogRebase(uint256 distribute);
    event LogSetContract(CONTRACTS contractType, address indexed _contract);
    event LogWarmupPeriod(uint256 period);

    constructor(
        address _Tulip,
        address _sTulip,
        uint32 _epochLength,
        uint256 _firstEpochNumber,
        uint32 _firstEpochTime
    ) {
        require(_Tulip != address(0));
        Tulip = IERC20(_Tulip);
        require(_sTulip != address(0));
        sTulip = IsTulipERC20(_sTulip);

        epoch = Epoch({length: _epochLength, number: _firstEpochNumber, endTime: _firstEpochTime, distribute: 0});
    }

    struct Claim {
        uint256 deposit;
        uint256 gons;
        uint256 expiry;
        bool lock; // prevents malicious delays
    }
    mapping(address => Claim) public warmupInfo;

    /**
        @notice stake Tulip to enter warmup
        @param _amount uint
        @return bool
     */
    function stake(uint256 _amount, address _recipient) external override returns (bool) {
        rebase();

        Tulip.safeTransferFrom(msg.sender, address(this), _amount);

        Claim memory info = warmupInfo[_recipient];
        require(!info.lock, "Deposits for account are locked");

        warmupInfo[_recipient] = Claim({
            deposit: info.deposit.add(_amount),
            gons: info.gons.add(sTulip.gonsForBalance(_amount)),
            expiry: epoch.number.add(warmupPeriod),
            lock: false
        });

        sTulip.safeTransfer(address(warmupContract), _amount);
        emit LogStake(_recipient, _amount);
        return true;
    }

    /**
        @notice retrieve sTulip from warmup
        @param _recipient address
     */
    function claim(address _recipient) external override {
        Claim memory info = warmupInfo[_recipient];
        if (epoch.number >= info.expiry && info.expiry != 0) {
            delete warmupInfo[_recipient];
            uint256 amount = sTulip.balanceForGons(info.gons);
            warmupContract.retrieve(_recipient, amount);
            emit LogClaim(_recipient, amount);
        }
    }

    /**
        @notice forfeit sTulip in warmup and retrieve Tulip
     */
    function forfeit() external {
        Claim memory info = warmupInfo[msg.sender];
        delete warmupInfo[msg.sender];
        uint256 sTulipBalance = sTulip.balanceForGons(info.gons);
        warmupContract.retrieve(address(this), sTulipBalance);
        Tulip.safeTransfer(msg.sender, info.deposit);
        emit LogForfeit(msg.sender, sTulipBalance, info.deposit);
    }

    /**
        @notice prevent new deposits to address (protection from malicious activity)
     */
    function toggleDepositLock() external {
        warmupInfo[msg.sender].lock = !warmupInfo[msg.sender].lock;
        emit LogDepositLock(msg.sender, warmupInfo[msg.sender].lock);
    }

    /**
        @notice redeem sTulip for Tulip
        @param _amount uint
        @param _trigger bool
     */
    function unstake(uint256 _amount, bool _trigger) external override {
        if (_trigger) {
            rebase();
        }
        sTulip.safeTransferFrom(msg.sender, address(this), _amount);
        Tulip.safeTransfer(msg.sender, _amount);
        emit LogUnstake(msg.sender, _amount);
    }

    /**
        @notice returns the sTulip index, which tracks rebase growth
        @return uint
     */
    function index() external view returns (uint256) {
        return sTulip.index();
    }

    /**
        @notice trigger rebase if epoch over
     */
    function rebase() public {
        if (epoch.endTime <= uint32(block.timestamp)) {
            sTulip.rebase(epoch.distribute, epoch.number);

            epoch.endTime = epoch.endTime.add32(epoch.length);
            epoch.number++;

            if (address(distributor) != address(0)) {
                distributor.distribute();
            }

            uint256 balance = contractBalance();
            uint256 staked = sTulip.circulatingSupply();

            if (balance <= staked) {
                epoch.distribute = 0;
            } else {
                epoch.distribute = balance.sub(staked);
            }
            emit LogRebase(epoch.distribute);
        }
    }

    /**
        @notice returns contract Tulip holdings, including bonuses provided
        @return uint
     */
    function contractBalance() public view returns (uint256) {
        return Tulip.balanceOf(address(this)).add(totalBonus);
    }

    enum CONTRACTS {
        DISTRIBUTOR,
        WARMUP
    }

    /**
        @notice sets the contract address for LP staking
        @param _contract address
     */
    function setContract(CONTRACTS _contract, address _address) external onlyOwner {
        if (_contract == CONTRACTS.DISTRIBUTOR) {
            // 0
            distributor = IDistributor(_address);
        } else if (_contract == CONTRACTS.WARMUP) {
            // 1
            require(address(warmupContract) == address(0), "Warmup cannot be set more than once");
            warmupContract = IWarmup(_address);
        }
        emit LogSetContract(_contract, _address);
    }

    /**
     * @notice set warmup period in epoch's numbers for new stakers
     * @param _warmupPeriod uint
     */
    function setWarmup(uint256 _warmupPeriod) external onlyOwner {
        warmupPeriod = _warmupPeriod;
        emit LogWarmupPeriod(_warmupPeriod);
    }
}
