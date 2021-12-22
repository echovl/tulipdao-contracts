const hre = require("hardhat")

async function main() {
    const accounts = await hre.ethers.getSigners()

    let mimAddress
    let epochLength = 60 * 60 * 1
    let firstEpochTime = Math.round(Date.now() / 1000) + 60 * 60

    if (hre.network.name == "testnet" || hre.network.name == "hardhat") {
        const MIM = await hre.ethers.getContractFactory("Token")
        const mim = await MIM.deploy("Magic Internet Money", "MIM", 18)
        await mim.deployed()
        mimAddress = mim.address

        console.log("MIM token deployed  to: ", mim.address)
    }

    const TULIP = await hre.ethers.getContractFactory("TulipERC20Token")
    const tulip = await TULIP.deploy()
    await tulip.deployed()

    console.log("Tulip token deployed  to: ", tulip.address)

    const STULIP = await hre.ethers.getContractFactory("sTulipERC20Token")
    const sTulip = await STULIP.deploy()
    await sTulip.deployed()

    console.log("Staked Tulip token deployed  to: ", sTulip.address)

    const TREASURY = await hre.ethers.getContractFactory("TulipTreasury")
    const treasury = await TREASURY.deploy(tulip.address, mimAddress, 100)
    await treasury.deployed()

    console.log("Treasury deployed  to: ", treasury.address)

    const CALCULATOR = await hre.ethers.getContractFactory(
        "TulipBondingCalculator"
    )
    const calculator = await CALCULATOR.deploy(tulip.address)
    await calculator.deployed()

    console.log("Bonding Calculator deployed  to: ", calculator.address)

    const BONDDEPOSITORY = await hre.ethers.getContractFactory(
        "TulipBondDepository"
    )
    const bondDepository = await BONDDEPOSITORY.deploy(
        tulip.address,
        mimAddress,
        treasury.address,
        accounts[0].address,
        calculator.address
    )
    await bondDepository.deployed()

    console.log("MIM Bond Depository deployed  to: ", bondDepository.address)

    const BONDSTAKEDEPOSITORY = await hre.ethers.getContractFactory(
        "TulipBondStakeDepository"
    )
    const bondStakeDepository = await BONDSTAKEDEPOSITORY.deploy(
        tulip.address,
        sTulip.address,
        mimAddress,
        treasury.address,
        accounts[0].address,
        calculator.address
    )
    await bondStakeDepository.deployed()

    console.log(
        "MIM Bond Stake Depository deployed  to: ",
        bondStakeDepository.address
    )

    const STAKING = await hre.ethers.getContractFactory("TulipStaking")
    const staking = await STAKING.deploy(
        tulip.address,
        sTulip.address,
        epochLength,
        1,
        firstEpochTime
    )
    await staking.deployed()

    console.log("Staking deployed  to: ", staking.address)

    const WARMUP = await hre.ethers.getContractFactory("TulipStakingWarmup")
    const warmup = await WARMUP.deploy(staking.address, sTulip.address)
    await warmup.deployed()

    console.log("Staking Warmup deployed  to: ", warmup.address)

    const DISTRIBUTOR = await hre.ethers.getContractFactory("TulipDistributor")
    const distributor = await DISTRIBUTOR.deploy(
        treasury.address,
        tulip.address,
        epochLength,
        firstEpochTime
    )
    await distributor.deployed()

    console.log("Distributor deployed  to: ", distributor.address)

    const STAKINGHELPER = await hre.ethers.getContractFactory(
        "TulipStakingHelper"
    )
    const stakingHelper = await STAKINGHELPER.deploy(
        staking.address,
        tulip.address
    )
    await stakingHelper.deployed()

    console.log("Staking Helper deployed  to: ", stakingHelper.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
