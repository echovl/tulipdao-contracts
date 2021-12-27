const hre = require("hardhat")
const fs = require("fs")

const BigNumber = hre.ethers.BigNumber

const argumentsDir = "./deploy/arguments"

async function main() {
    const accounts = await hre.ethers.getSigners()
    const owner = accounts[0]

    const LP = "0x0C504777d44EE4E371F291834dfc3a040D15A289"
    const TULIP = "0x504C3ECd1BD99EF212C209E405D58b7CB4545EB1"
    const CALCULATOR = "0x2E0070678aC722c9aacfE6e06E11246A826AD448"
    const TREASURY = "0x1a878EF1C14DFC4B15546F116696e1B08DBa16Fa"
    const STAKING = "0x1C5Af163DBfDcFd88942c457cF6bC9b7c6980EF7"

    // Bond parameters
    const bondControlVariable = 500
    const bondMinPrice = 1000 // 10 usd
    const bondMaxPayout = 5000 // 5% total supply
    const bondFee = 0
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
