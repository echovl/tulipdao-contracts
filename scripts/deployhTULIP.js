const hre = require("hardhat")
const fs = require("fs")

const BigNumber = hre.ethers.BigNumber

const argumentsDir = "./deploy/arguments"

async function main() {
    const TULIP = "0x9132c80CE2ac8bf036676e54E3011667D4FEfEB2"
    const PLANTED_TULIP = "0x4C7c3DDb1FAc7168d5c1de9e4cAA96836187aeAF"
    const STAKING = "0xB8669cEDA69E90AF7d2a20f9d1D3553394369Fe1"

    const HarvestedTulip = await hre.ethers.getContractFactory("HarvestedTulip")
    const harvestedTulip = await HarvestedTulip.deploy(
        TULIP,
        PLANTED_TULIP,
        STAKING,
        "Harvested Tulip",
        "hTULIP",
        "0.1.0"
    )

    saveArguments(
        "harvestedTulip.js",
        TULIP,
        PLANTED_TULIP,
        STAKING,
        "Harvested Tulip",
        "hTULIP",
        "0.1.0"
    )

    console.log("Harvested Tulip", harvestedTulip.address)
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
