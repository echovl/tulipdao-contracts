const hre = require("hardhat")
const fs = require("fs")

const ARGUMENTS_DIR = "./deploy/arguments"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

function saveArguments(filename, ...args) {
    fs.writeFileSync(`${ARGUMENTS_DIR}/${filename}`, parseArguments(...args))
}

function parseArguments(...args) {
    const parsedArgs = args.map((arg) => {
        return typeof arg == "string" ? `"${arg}"` : arg
    })

    return `module.exports = [${parsedArgs.join(",")}]`
}

async function main() {
    const accounts = await hre.ethers.getSigners()

    let mimAddress
    let epochLength = 60 * 60 * 1
    let firstEpochTime = Math.round(Date.now() / 1000) + 60 * 60

    const MIM = await hre.ethers.getContractFactory("Token")
    const mim = await MIM.deploy("Magic Internet Money", "MIM", 18)
    await mim.deployed()
    mimAddress = mim.address

    saveArguments("mim.js", "Magic Internet Money", "MIM", 18)

    console.log("MIM token deployed  to: ", mim.address)

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

    saveArguments(
        "treasury.js",
        tulip.address.toString(),
        mimAddress.toString(),
        100
    )

    console.log("Treasury deployed  to: ", treasury.address)

    const CALCULATOR = await hre.ethers.getContractFactory(
        "TulipBondingCalculator"
    )
    const calculator = await CALCULATOR.deploy(tulip.address)
    await calculator.deployed()

    saveArguments("calculator.js", tulip.address.toString())

    console.log("Bonding Calculator deployed  to: ", calculator.address)

    const BONDDEPOSITORY = await hre.ethers.getContractFactory(
        "TulipBondDepository"
    )
    const bondDepository = await BONDDEPOSITORY.deploy(
        tulip.address,
        mimAddress,
        treasury.address,
        accounts[0].address,
        ZERO_ADDRESS
    )
    await bondDepository.deployed()

    saveArguments(
        "bondDepository.js",
        tulip.address.toString(),
        mimAddress.toString(),
        treasury.address.toString(),
        accounts[0].address.toString(),
        ZERO_ADDRESS
    )

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
        ZERO_ADDRESS
    )
    await bondStakeDepository.deployed()

    saveArguments(
        "bondStakeDepository.js",
        tulip.address.toString(),
        sTulip.address.toString(),
        mimAddress.toString(),
        treasury.address.toString(),
        accounts[0].address.toString(),
        ZERO_ADDRESS
    )

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

    saveArguments(
        "staking.js",
        tulip.address.toString(),
        sTulip.address.toString(),
        epochLength,
        1,
        firstEpochTime
    )

    console.log("Staking deployed  to: ", staking.address)

    const WARMUP = await hre.ethers.getContractFactory("TulipStakingWarmup")
    const warmup = await WARMUP.deploy(staking.address, sTulip.address)
    await warmup.deployed()

    saveArguments(
        "warmup.js",
        staking.address.toString(),
        sTulip.address.toString()
    )

    console.log("Staking Warmup deployed  to: ", warmup.address)

    const DISTRIBUTOR = await hre.ethers.getContractFactory("TulipDistributor")
    const distributor = await DISTRIBUTOR.deploy(
        treasury.address,
        tulip.address,
        epochLength,
        firstEpochTime
    )
    await distributor.deployed()

    saveArguments(
        "distributor.js",
        treasury.address.toString(),
        tulip.address.toString(),
        epochLength,
        firstEpochTime
    )

    console.log("Distributor deployed  to: ", distributor.address)

    const STAKINGHELPER = await hre.ethers.getContractFactory(
        "TulipStakingHelper"
    )
    const stakingHelper = await STAKINGHELPER.deploy(
        staking.address,
        tulip.address
    )
    await stakingHelper.deployed()

    saveArguments(
        "stakingHelper.js",
        staking.address.toString(),
        tulip.address.toString()
    )

    console.log("Staking Helper deployed  to: ", stakingHelper.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
