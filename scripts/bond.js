const hre = require("hardhat")
const BigNumber = hre.ethers.BigNumber

const MIM_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const BOND_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"

async function main() {
    const accounts = await hre.ethers.getSigners()
    const owner = accounts[0]

    const BOND = await hre.ethers.getContractFactory("TulipBondDepository")
    const bond = await BOND.attach(BOND_ADDRESS)

    const MIM = await hre.ethers.getContractFactory("Token")
    const mim = await MIM.attach(MIM_ADDRESS)

    console.log("Bond Price: ", await bond.bondPrice())

    const one_mim = BigNumber.from("1000000000000000000")
    await mim.mint(owner.address, one_mim)
    await mim.approve(BOND_ADDRESS, one_mim)
    const res = await bond.deposit(one_mim, 1010, owner.address)

    console.log(res)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
