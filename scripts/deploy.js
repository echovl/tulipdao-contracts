const hre = require("hardhat")
const fs = require("fs")

const BigNumber = hre.ethers.BigNumber

const argumentsDir = "./deploy/arguments"

async function main() {
    const accounts = await hre.ethers.getSigners()
    const owner = accounts[0]

    const zeroAddress = "0x0000000000000000000000000000000000000000"

    const initialTulipSupply = BigNumber.from("100000000000")

    // Stake parameters
    const initialRewardRate = 5000 // 0.5%
    const stakeEpochLength = 3600 // in seconds
    const stakeFirstEpochTime = Math.round(Date.now() / 1000) + 300

    // Bond parameters
    const bondControlVariable = 500
    const bondMinPrice = 1000 // 10 usd
    const bondMaxPayout = 5000 // 5% total supply
    const bondFee = 0
    const bondMaxDebt = BigNumber.from("10000000000000000000") // max total debt, 9 decimals
    const bondVestingTerm = 129600 // 36 hours
    const bondEpochLength = 3600

    let mimAddress
    const MIM = await hre.ethers.getContractFactory("Token")
    const mim = await MIM.deploy("Magic Internet Money", "MIM", 18)
    mimAddress = mim.address

    saveArguments("mim.js", "Magic Internet Money", "MIM", 18)

    const TULIP = await hre.ethers.getContractFactory("TulipERC20Token")
    const tulip = await TULIP.deploy()

    const STULIP = await hre.ethers.getContractFactory("sTulipERC20Token")
    const sTulip = await STULIP.deploy()

    const TulipTreasury = await hre.ethers.getContractFactory("TulipTreasury")
    const tulipTreasury = await TulipTreasury.deploy(
        tulip.address,
        mimAddress,
        0
    )

    saveArguments(
        "treasury.js",
        tulip.address.toString(),
        mimAddress.toString(),
        0
    )

    const BondingCalculator = await hre.ethers.getContractFactory(
        "TulipBondingCalculator"
    )
    const bondingCalculator = await BondingCalculator.deploy(tulip.address)

    saveArguments("calculator.js", tulip.address.toString())

    const MIMBondDepository = await hre.ethers.getContractFactory(
        "TulipBondDepository"
    )
    const mimBondDepository = await MIMBondDepository.deploy(
        tulip.address,
        mimAddress,
        tulipTreasury.address,
        owner.address,
        zeroAddress
    )

    saveArguments(
        "bondDepository.js",
        tulip.address.toString(),
        mimAddress.toString(),
        tulipTreasury.address.toString(),
        owner.address.toString(),
        zeroAddress
    )

    const MIMBondStakeDepository = await hre.ethers.getContractFactory(
        "TulipBondStakeDepository"
    )
    const mimBondStakeDepository = await MIMBondStakeDepository.deploy(
        tulip.address,
        sTulip.address,
        mimAddress,
        tulipTreasury.address,
        owner.address,
        zeroAddress
    )

    saveArguments(
        "bondStakeDepository.js",
        tulip.address.toString(),
        sTulip.address.toString(),
        mimAddress.toString(),
        tulipTreasury.address.toString(),
        owner.address.toString(),
        zeroAddress
    )

    const TulipStaking = await hre.ethers.getContractFactory("TulipStaking")
    const tulipStaking = await TulipStaking.deploy(
        tulip.address,
        sTulip.address,
        stakeEpochLength,
        1,
        stakeFirstEpochTime
    )

    saveArguments(
        "staking.js",
        tulip.address.toString(),
        sTulip.address.toString(),
        stakeEpochLength,
        1,
        stakeFirstEpochTime
    )

    const Warmup = await hre.ethers.getContractFactory("TulipStakingWarmup")
    const warmup = await Warmup.deploy(tulipStaking.address, sTulip.address)

    saveArguments(
        "warmup.js",
        tulipStaking.address.toString(),
        sTulip.address.toString()
    )

    const Distributor = await hre.ethers.getContractFactory("TulipDistributor")
    const distributor = await Distributor.deploy(
        tulipTreasury.address,
        tulip.address,
        stakeEpochLength,
        stakeFirstEpochTime
    )

    saveArguments(
        "distributor.js",
        tulipTreasury.address.toString(),
        tulip.address.toString(),
        stakeEpochLength,
        stakeFirstEpochTime
    )

    const StakingHelper = await hre.ethers.getContractFactory(
        "TulipStakingHelper"
    )
    const stakingHelper = await StakingHelper.deploy(
        tulipStaking.address,
        tulip.address
    )

    saveArguments(
        "stakingHelper.js",
        tulipStaking.address.toString(),
        tulip.address.toString()
    )

    // setup tulip and stulip
    await tulip.setVault(owner.address)
    await sTulip.initialize(tulipStaking.address)

    // setup staking
    await distributor.addRecipient(tulipStaking.address, initialRewardRate)
    await tulipStaking.setContract(0, distributor.address)
    await tulipStaking.setContract(1, warmup.address)

    // setup treasury
    await tulipTreasury.queue(0, mimBondDepository.address) // reserve depositor
    await tulipTreasury.queue(0, mimBondStakeDepository.address) // reserve depositor
    await tulipTreasury.queue(8, distributor.address) // reward manager

    // setup bonds
    await mimBondDepository.setStaking(tulipStaking.address, false)
    await mimBondDepository.initializeBondTerms(
        bondControlVariable,
        bondMinPrice,
        bondMaxPayout,
        bondFee,
        bondMaxDebt,
        bondVestingTerm
    )
    await mimBondStakeDepository.setStaking(tulipStaking.address, false)
    await mimBondStakeDepository.initializeBondTerms(
        bondControlVariable,
        bondMinPrice,
        bondMaxPayout,
        bondFee,
        bondMaxDebt,
        bondVestingTerm,
        bondEpochLength
    )

    await tulipTreasury.toggle(0, mimBondDepository.address, zeroAddress)
    await tulipTreasury.toggle(0, mimBondStakeDepository.address, zeroAddress)
    await tulipTreasury.toggle(8, distributor.address, zeroAddress)

    await tulip.mint(owner.address, initialTulipSupply)
    await tulip.setVault(tulipTreasury.address)

    console.log("MIM: ", mim.address)
    console.log("Tulip: ", tulip.address)
    console.log("sTulip: ", sTulip.address)
    console.log("Treasury: ", tulipTreasury.address)
    console.log("Bonding Calculator: ", bondingCalculator.address)
    console.log("MIM Bond Depository: ", mimBondDepository.address)
    console.log("MIM Bond Stake Depository: ", mimBondStakeDepository.address)
    console.log("Staking: ", tulipStaking.address)
    console.log("Staking Warmup: ", warmup.address)
    console.log("Staking Helper: ", stakingHelper.address)
    console.log("Distributor: ", distributor.address)
}

function saveArguments(filename, ...args) {
    fs.writeFileSync(`${argumentsDir}/${filename}`, parseArguments(...args))
}

function parseArguments(...args) {
    const parsedArgs = args.map((arg) => {
        return typeof arg == "string" ? `"${arg}"` : arg
    })

    return `module.exports = [${parsedArgs.join(",")}]`
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
