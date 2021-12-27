const hre = require("hardhat")
const fs = require("fs")

const BigNumber = hre.ethers.BigNumber

const argumentsDir = "./deploy/arguments"

async function main() {
    const accounts = await hre.ethers.getSigners()
    const owner = accounts[0]

    const LP = "0xAAE789866dE94dA3485430c76138b8e7C31A4604"
    const TULIP = "0x9132c80CE2ac8bf036676e54E3011667D4FEfEB2"
    const CALCULATOR = "0x98f41863423aA6941f191Ffb21aC99bC3E30eE28"
    const TREASURY = "0xE3AbC3e7Fcca778d944D56F6dd1d1F63Db0a3e84"
    const STAKING = "0xB8669cEDA69E90AF7d2a20f9d1D3553394369Fe1"

    // Bond parameters
    const bondControlVariable = 500
    const bondMinPrice = 1000 // 10 usd
    const bondMaxPayout = 5000 // 5% total supply
    const bondFee = 500 // 5% of payouts
    const bondMaxDebt = BigNumber.from("10000000000000000000") // max total debt, 9 decimals
    const bondVestingTerm = 129600 // 36 hours
    //const bondEpochLength = 3600

    const TulipTreasury = await hre.ethers.getContractFactory("TulipTreasury")
    const tulipTreasury = await TulipTreasury.attach(TREASURY)

    const LpBondDepository = await hre.ethers.getContractFactory(
        "TulipBondDepository"
    )
    const lpBondDepository = await LpBondDepository.deploy(
        TULIP,
        LP,
        TREASURY,
        owner.address,
        CALCULATOR
    )

    saveArguments(
        "lpBondDepository.js",
        TULIP,
        LP,
        TREASURY,
        owner.address.toString(),
        CALCULATOR
    )

    // setup treasury
    await tulipTreasury.queue(4, lpBondDepository.address) // lp depositor
    await tulipTreasury.queue(5, LP) // lp token

    // setup bonds
    await lpBondDepository.setStaking(STAKING, false)
    await lpBondDepository.initializeBondTerms(
        bondControlVariable,
        bondMinPrice,
        bondMaxPayout,
        bondFee,
        bondMaxDebt,
        bondVestingTerm
    )

    await tulipTreasury.toggle(4, lpBondDepository.address, CALCULATOR)
    await tulipTreasury.toggle(5, LP, CALCULATOR)

    console.log("MIM-TULIP Bond Depository: ", lpBondDepository.address)
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
