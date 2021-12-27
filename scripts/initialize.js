const hre = require("hardhat")
const BigNumber = hre.ethers.BigNumber

const STULIP_ADDRESS = "0x21ED14e9BE7B2D178c68fe1d76451074D2874482"
const STAKING_ADDRESS = "0x78D8eDdD05106D1398AA42E48cAd249a1f1f3c49"
const DISTRIBUTOR_ADDRESS = "0xFe10ad92EA8B78c2ab0C55e21eBB7784c8B1acbb"
const WARMUP_ADDRESS = "0x531e45A8a4c152BfDC02526D1870b186ddc085D0"
const TULIP_ADDRESS = "0x3De99480845342176a8E173d4292F44c206c1bf1"
const TREASURY_ADDRESS = "0x1C681AeD326Dc9bA0A6A65b572C29592202ed7A1"
const BOND_ADDRESS = "0x1daa690B633041Bd296977dF5439943B4d401edD"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const TULIP_OWNER_SUPPLY = BigNumber.from("1000000000000")
const STAKING_REWARD_RATE = 5000 // 0.5%

// Bond terms
const BOND_CONTROL_VARIABLE = 500
const BOND_MINIMUM_PRICE = 1000 // 10 usd
const BOND_MAX_PAYOUT = 5000 // 5% of total supply
const BOND_FEE = 0 // 0%
const BOND_MAX_DEBT = BigNumber.from("10000000000000000000") // max total debt, 9 decimals
const BOND_VESTING_TERM = 129600 // 360 hours

async function main() {
    const accounts = await hre.ethers.getSigners()
    const owner = accounts[0]

    const STULIP = await hre.ethers.getContractFactory("sTulipERC20Token")
    const stulip = await STULIP.attach(STULIP_ADDRESS)

    const TULIP = await hre.ethers.getContractFactory("TulipERC20Token")
    const tulip = await TULIP.attach(TULIP_ADDRESS)

    const DISTRIBUTOR = await hre.ethers.getContractFactory("TulipDistributor")
    const distributor = await DISTRIBUTOR.attach(DISTRIBUTOR_ADDRESS)

    const STAKING = await hre.ethers.getContractFactory("TulipStaking")
    const staking = await STAKING.attach(STAKING_ADDRESS)

    const TREASURY = await hre.ethers.getContractFactory("TulipTreasury")
    const treasury = await TREASURY.attach(TREASURY_ADDRESS)

    const BOND = await hre.ethers.getContractFactory("TulipBondDepository")
    const bond = await BOND.attach(BOND_ADDRESS)

    await tulip.setVault(owner.address)

    await delay(10000)

    await tulip.mint(owner.address, TULIP_OWNER_SUPPLY) // 100 TULIP
    await tulip.setVault(TREASURY_ADDRESS)

    await stulip.initialize(STAKING_ADDRESS)

    await distributor.addRecipient(STAKING_ADDRESS, STAKING_REWARD_RATE) // 0.5%

    await staking.setContract(0, DISTRIBUTOR_ADDRESS)
    await staking.setContract(1, WARMUP_ADDRESS)

    await treasury.queue(0, BOND_ADDRESS) // reserve depositor
    await treasury.queue(8, DISTRIBUTOR_ADDRESS) // reward manager

    await delay(10000)

    await treasury.toggle(0, BOND_ADDRESS, ZERO_ADDRESS)
    await treasury.toggle(8, DISTRIBUTOR_ADDRESS, ZERO_ADDRESS)

    await bond.setStaking(STAKING_ADDRESS, false)
    await bond.initializeBondTerms(
        BOND_CONTROL_VARIABLE,
        BOND_MINIMUM_PRICE,
        BOND_MAX_PAYOUT,
        BOND_FEE,
        BOND_MAX_DEBT,
        BOND_VESTING_TERM
    )
}

async function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
