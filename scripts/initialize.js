const hre = require("hardhat")
const BigNumber = hre.ethers.BigNumber

const STULIP_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
const STAKING_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
const DISTRIBUTOR_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"
const WARMUP_ADDRESS = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
const TULIP_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
const TREASURY_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
const BOND_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

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
    await tulip.mint(owner.address, 100e9) // 100 TULIP
    await tulip.setVault(TREASURY_ADDRESS)

    await stulip.initialize(STAKING_ADDRESS)

    await distributor.addRecipient(STAKING_ADDRESS, 5000) // 0.5%

    await staking.setContract(0, DISTRIBUTOR_ADDRESS)
    await staking.setContract(1, WARMUP_ADDRESS)

    await treasury.queue(0, BOND_ADDRESS) // reserve depositor
    await treasury.queue(8, DISTRIBUTOR_ADDRESS) // reward manager
    await treasury.toggle(0, BOND_ADDRESS, ZERO_ADDRESS)
    await treasury.toggle(8, DISTRIBUTOR_ADDRESS, ZERO_ADDRESS)

    await bond.setStaking(STAKING_ADDRESS, false)
    await bond.initializeBondTerms(
        500,
        1000,
        5000,
        0,
        BigNumber.from("1000000000000000000"),
        129600
    )
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
