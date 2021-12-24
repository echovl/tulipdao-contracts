const hre = require("hardhat")

async function main() {
    const accounts = await hre.ethers.getSigners()

    //const mimAddress = "0x666d54845D1a48F6A120bf9ADCAc7d35C9b4596b"
    const bondDepositoryAddress = "0xc88591b0D9823319b1ed51D127dbC0E6d728878c"

    const BOND = await hre.ethers.getContractFactory("TulipBondDepository")
    const bond = await BOND.attach(bondDepositoryAddress)

    const res = await bond.deposit(
        "1000000000000000000",
        1010,
        accounts[0].address
    )

    console.log(res)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
