const hre = require("hardhat")
const BigNumber = hre.ethers.BigNumber

const MIM_ADDRESS = "0xafCF06B70897562dc0b50C1448ED5c6Bc0438c66"
const BOND_ADDRESS = "0x4a174e8D1e5415E340526be7123787927439d973"

async function main() {
    const accounts = await hre.ethers.getSigners()
    const owner = accounts[0]

    const BOND = await hre.ethers.getContractFactory("TulipBondDepository")
    const bond = await BOND.attach(BOND_ADDRESS)

    const MIM = await hre.ethers.getContractFactory("Token")
    const mim = await MIM.attach(MIM_ADDRESS)

    console.log("Bond Price: ", await bond.bondPrice())

    const hundredMIM = BigNumber.from("50000000000000000000")
    await mim.approve(BOND_ADDRESS, hundredMIM)
    await mim.mint(owner.address, hundredMIM)

    console.log(
        "Bond vested percent: ",
        await bond.percentVestedFor(owner.address)
    )
    //console.log("Bond payout for: ", await bond.pendingPayoutFor(owner.address))

    await bond.deposit(hundredMIM, 1000000, owner.address)
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
