require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")

require("dotenv").config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners()

    for (const account of accounts) {
        console.log(account.address)
    }
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.7.5",
                settings: {
                    metadata: {
                        bytecodeHash: "none",
                    },
                    optimizer: {
                        enabled: true,
                        runs: 800,
                    },
                },
            },
            {
                version: "0.5.16",
            },
        ],
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        ftmTestnet: {
            url: "https://rpc.testnet.fantom.network/",
            accounts: [process.env.TESTNET_PRIVATE_KEY],
            chainId: 4002,
        },
    },
    etherscan: {
        apiKey: `${process.env.ETHERSCAN_API_KEY}`,
    },
}
