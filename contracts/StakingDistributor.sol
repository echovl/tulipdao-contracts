// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;
pragma abicoder v2;

import "./interfaces/IERC20.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/IDistributor.sol";

import "./libraries/LowGasSafeMath.sol";

import "./types/Ownable.sol";

contract TulipDistributor is Ownable, IDistributor {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for uint32;

    /* ====== VARIABLES ====== */

    IERC20 public immutable TULIP;
    ITreasury public immutable treasury;

    uint32 public immutable epochLength;
    uint32 public nextEpochTime;

    mapping(uint256 => Adjust) public adjustments;

    event LogDistribute(address indexed recipient, uint256 amount);
    event LogAdjust(uint256 initialRate, uint256 currentRate, uint256 targetRate);
    event LogAddRecipient(address indexed recipient, uint256 rate);
    event LogRemoveRecipient(address indexed recipient);

    /* ====== STRUCTS ====== */

    struct Info {
        uint256 rate; // in ten-thousandths ( 5000 = 0.5% )
        address recipient;
    }
    Info[] public info;

    struct Adjust {
        bool add;
        uint256 rate;
        uint256 target;
    }

    /* ====== CONSTRUCTOR ====== */

    constructor(
        address _treasury,
        address _tulip,
        uint32 _epochLength,
        uint32 _nextEpochTime
    ) {
        require(_treasury != address(0));
        treasury = ITreasury(_treasury);
        require(_tulip != address(0));
        TULIP = IERC20(_tulip);
        epochLength = _epochLength;
        nextEpochTime = _nextEpochTime;
    }

    /* ====== PUBLIC FUNCTIONS ====== */

    /**
        @notice send epoch reward to staking contract
     */
    function distribute() external override returns (bool) {
        if (nextEpochTime <= uint32(block.timestamp)) {
            nextEpochTime = nextEpochTime.add32(epochLength); // set next epoch time

            // distribute rewards to each recipient
            for (uint256 i = 0; i < info.length; i++) {
                if (info[i].rate > 0) {
                    treasury.mintRewards(info[i].recipient, nextRewardAt(info[i].rate)); // mint and send from treasury
                    adjust(i); // check for adjustment
                }
                emit LogDistribute(info[i].recipient, nextRewardAt(info[i].rate));
            }
            return true;
        } else {
            return false;
        }
    }

    /* ====== INTERNAL FUNCTIONS ====== */

    /**
        @notice increment reward rate for collector
     */
    function adjust(uint256 _index) internal {
        Adjust memory adjustment = adjustments[_index];
        if (adjustment.rate != 0) {
            uint256 initial = info[_index].rate;
            uint256 rate = initial;
            if (adjustment.add) {
                // if rate should increase
                rate = rate.add(adjustment.rate); // raise rate
                if (rate >= adjustment.target) {
                    // if target met
                    rate = adjustment.target;
                    delete adjustments[_index];
                }
            } else {
                // if rate should decrease
                rate = rate.sub(adjustment.rate); // lower rate
                if (rate <= adjustment.target) {
                    // if target met
                    rate = adjustment.target;
                    delete adjustments[_index];
                }
            }
            info[_index].rate = rate;
            emit LogAdjust(initial, rate, adjustment.target);
        }
    }

    /* ====== VIEW FUNCTIONS ====== */

    /**
        @notice view function for next reward at given rate
        @param _rate uint
        @return uint
     */
    function nextRewardAt(uint256 _rate) public view returns (uint256) {
        return TULIP.totalSupply().mul(_rate).div(1000000);
    }

    /**
        @notice view function for next reward for specified address
        @param _recipient address
        @return uint
     */
    function nextRewardFor(address _recipient) external view returns (uint256) {
        uint256 reward;
        for (uint256 i = 0; i < info.length; i++) {
            if (info[i].recipient == _recipient) {
                reward = nextRewardAt(info[i].rate);
            }
        }
        return reward;
    }

    /* ====== POLICY FUNCTIONS ====== */

    /**
        @notice adds recipient for distributions
        @param _recipient address
        @param _rewardRate uint
     */
    function addRecipient(address _recipient, uint256 _rewardRate) external onlyOwner {
        require(_recipient != address(0), "IA");
        //require(_rewardRate <= 5000, "Too high reward rate");
        //require(info.length <= 4, "limit recipients max to 5");
        info.push(Info({recipient: _recipient, rate: _rewardRate}));
        emit LogAddRecipient(_recipient, _rewardRate);
    }

    /**
        @notice removes recipient for distributions
        @param _index uint
        @param _recipient address
     */
    function removeRecipient(uint256 _index, address _recipient) external onlyOwner {
        require(_recipient == info[_index].recipient, "NA");
        info[_index] = info[info.length - 1];
        adjustments[_index] = adjustments[info.length - 1];
        info.pop();
        delete adjustments[info.length - 1];
        emit LogRemoveRecipient(_recipient);
    }

    /**
        @notice set adjustment info for a collector's reward rate
        @param _index uint
        @param _add bool
        @param _rate uint
        @param _target uint
     */
    function setAdjustment(
        uint256 _index,
        bool _add,
        uint256 _rate,
        uint256 _target
    ) external onlyOwner {
        require(_target <= 5000, "Too high reward rate");
        adjustments[_index] = Adjust({add: _add, rate: _rate, target: _target});
    }
}
