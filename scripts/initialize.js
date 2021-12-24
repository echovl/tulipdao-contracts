const hre = require("hardhat")

async function main() {
    const accounts = await hre.ethers.getSigners()

    let mimAddress

    const MIM = await hre.ethers.getContractFactory("Token")
    const mim = await MIM.deploy("Magic Internet Money", "MIM", 18)
    await mim.deployed()
    mimAddress = mim.address

    saveArguments("mim.js", "Magic Internet Money", "MIM", 18)

    console.log("MIM token deployed  to: ", mim.address)

    const TULIP = await hre.ethers.getContractFactory("TulipERC20Token")
    const tulip = await TULIP.deploy()
    await tulip.deployed()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
