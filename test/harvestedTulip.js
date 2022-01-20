const { expect, use } = require("chai")
const { ethers } = require("hardhat")
const { solidity } = require("ethereum-waffle")
const bn = ethers.BigNumber

use(solidity)

const BASE_DIVISOR = 100
const PRECISION = 1e9
const WEEK = 7 * 86400
const DAY = 86400
const HOUR = 3600
const TOL = 120 / WEEK
const MAXTIME = 4 * 365 * 86400

describe("HarvestedTulip", () => {
    let tulip
    let plantedTulip
    let staking
    let harvestedTulip
    let owner
    let alice
    let bob

    beforeEach(async () => {
        ;[owner, alice, bob] = await ethers.getSigners()

        const Tulip = await ethers.getContractFactory("TulipERC20Token")
        tulip = await Tulip.deploy()

        const PlantedTulip = await ethers.getContractFactory("sTulipERC20Token")
        plantedTulip = await PlantedTulip.deploy()

        const Staking = await ethers.getContractFactory("TulipStaking")
        staking = await Staking.deploy(
            tulip.address,
            plantedTulip.address,
            3600,
            1,
            Math.round(Date.now() / 1000)
        )

        const Warmup = await ethers.getContractFactory("TulipStakingWarmup")
        const warmup = await Warmup.deploy(
            staking.address,
            plantedTulip.address
        )

        const HarvestedTulip = await ethers.getContractFactory("HarvestedTulip")
        harvestedTulip = await HarvestedTulip.deploy(
            tulip.address,
            plantedTulip.address,
            staking.address,
            "Harvested Tulip",
            "hTULIP",
            "0.1.0"
        )

        await tulip.setVault(owner.address)
        await staking.setContract(1, warmup.address)
        await tulip.mint(alice.address, 10e9)
        await tulip.mint(owner.address, 10e9)
        await tulip.mint(bob.address, 10e9)
        await plantedTulip.initialize(staking.address)
    })

    describe("create_lock", () => {
        it("locks amount of tokens and stakes it", async () => {
            const amount = bn.from(1e9)
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_lock(amount, end)

            const stakedBalance = await plantedTulip.balanceOf(
                harvestedTulip.address
            )
            const point = await harvestedTulip.user_point_history(
                alice.address,
                1
            )
            const totalSupply = await harvestedTulip["totalSupply()"]()
            const veBalance = await harvestedTulip["balanceOf(address)"](
                alice.address
            )

            expect(totalSupply).to.equal(veBalance)
            expect(stakedBalance).to.equal(amount)
            expect(point.base).to.equal(amount.mul(PRECISION).div(BASE_DIVISOR))
            expect(point.slope).to.equal(amount.mul(PRECISION).div(MAXTIME))
            expect(point.bias).to.equal(point.slope.mul(end - point.ts))
        })

        it("reverts if amount is zero", async () => {
            const amount = 0
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await expect(harvestedTulip.connect(alice).create_lock(amount, end))
                .to.be.reverted
        })

        it("reverts if unlock_time is in the past", async () => {
            const amount = bn.from(1e9)
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) - 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await expect(harvestedTulip.connect(alice).create_lock(amount, end))
                .to.be.reverted
        })

        it("reverts if unlock_time is greater than MAXTIME", async () => {
            const amount = bn.from(1e9)
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) + 10000) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await expect(harvestedTulip.connect(alice).create_lock(amount, end))
                .to.be.reverted
        })
    })

    describe("create_soft_lock", () => {
        it("locks amount of tokens and stakes it", async () => {
            const amount = bn.from(1e9)

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_soft_lock(amount)

            const stakedBalance = await plantedTulip.balanceOf(
                harvestedTulip.address
            )
            const point = await harvestedTulip.user_point_history(
                alice.address,
                1
            )
            const totalSupply = await harvestedTulip["totalSupply()"]()
            const veBalance = await harvestedTulip["balanceOf(address)"](
                alice.address
            )

            expect(totalSupply).to.equal(veBalance)
            expect(stakedBalance).to.equal(amount)
            expect(point.base).to.equal(amount.mul(PRECISION).div(BASE_DIVISOR))
            expect(point.bias).to.equal(0)
            expect(point.slope).to.equal(0)
        })

        it("reverts if amount is zero", async () => {
            const amount = 0

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await expect(harvestedTulip.connect(alice).create_soft_lock(amount))
                .to.be.reverted
        })

        it("reverts if a lock exists", async () => {
            const amount = bn.from(1e9)

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_soft_lock(amount.div(2))

            await expect(
                harvestedTulip.connect(alice).create_soft_lock(amount.div(2))
            ).to.be.reverted
        })
    })

    describe("withdraw", () => {
        it("withdraws locked tokens", async () => {
            const amount = await tulip.balanceOf(alice.address)
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_lock(amount, end)

            await chainSleep(3 * WEEK)

            const balance = await plantedTulip.balanceOf(harvestedTulip.address)

            await harvestedTulip.connect(alice).withdraw()

            expect(await tulip.balanceOf(alice.address)).to.equal(balance)
        })

        it("reverts if tokens are not yet unlocked", async () => {
            const amount = await tulip.balanceOf(alice.address)
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_lock(amount, end)

            await chainSleep(1 * WEEK)

            await expect(harvestedTulip.connect(alice).withdraw()).to.be
                .reverted
        })
    })

    describe("balanceOf", () => {
        it("uses normal ve formula if inside locked window", async () => {
            const amount = await tulip.balanceOf(alice.address)
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_lock(amount, end)

            const point = await harvestedTulip.user_point_history(
                alice.address,
                1
            )
            const timestamp = (await getChainTimestamp()) + WEEK
            const veBalance = await harvestedTulip[
                "balanceOf(address,uint256)"
            ](alice.address, timestamp)

            expect(veBalance).to.equal(
                point.base.add(
                    point.bias.sub(point.slope.mul(timestamp - point.ts))
                )
            )
        })

        it("uses base if outside locked window", async () => {
            const amount = await tulip.balanceOf(alice.address)
            const end =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_lock(amount, end)

            const point = await harvestedTulip.user_point_history(
                alice.address,
                1
            )
            const timestamp = (await getChainTimestamp()) + 5 * WEEK
            const veBalance = await harvestedTulip[
                "balanceOf(address,uint256)"
            ](alice.address, timestamp)

            expect(veBalance).to.equal(point.base)
        })
    })

    describe("lock after lock", () => {
        it("stores the checkpoints correctly", async () => {
            const amount = await tulip.balanceOf(alice.address)
            const end1 =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_lock(amount, end1)

            await chainSleep(3 * WEEK)
            await harvestedTulip.connect(alice).withdraw()

            const end2 =
                (Math.floor((await getChainTimestamp()) / WEEK) + 2) * WEEK

            await tulip.connect(alice).approve(harvestedTulip.address, amount)
            await harvestedTulip.connect(alice).create_lock(amount, end2)

            const epoch = await harvestedTulip.user_point_epoch(alice.address)
            const point1 = await harvestedTulip.user_point_history(
                alice.address,
                1
            )
            const point2 = await harvestedTulip.user_point_history(
                alice.address,
                2
            )
            const point3 = await harvestedTulip.user_point_history(
                alice.address,
                3
            )

            expect(epoch).to.equal(3)

            expect(point1.base).to.equal(
                amount.mul(PRECISION).div(BASE_DIVISOR)
            )
            expect(point1.slope).to.equal(amount.mul(PRECISION).div(MAXTIME))
            expect(point1.bias).to.equal(point1.slope.mul(end1 - point1.ts))

            expect(point2.base).to.equal(0)
            expect(point2.slope).to.equal(0)
            expect(point2.bias).to.equal(0)

            expect(point3.base).to.equal(
                amount.mul(PRECISION).div(BASE_DIVISOR)
            )
            expect(point3.slope).to.equal(amount.mul(PRECISION).div(MAXTIME))
            expect(point3.bias).to.equal(point3.slope.mul(end2 - point3.ts))
        })
    })

    describe("voting power", () => {
        it("follows a curve overtime", async () => {
            const amount = await tulip.balanceOf(alice.address)
            const amountP = amount.mul(PRECISION)
            const amountB = amountP.div(100)

            await tulip.connect(alice).approve(harvestedTulip.address, amount)

            expect(await harvestedTulip["totalSupply()"]()).to.equal(0)

            let chainTimestamp = await getChainTimestamp()

            await chainSleep(
                (Math.floor(chainTimestamp / WEEK) + 1) * WEEK - chainTimestamp
            )
            await chainMine()

            await chainSleep(HOUR)

            await harvestedTulip
                .connect(alice)
                .create_lock(amount, (await getChainTimestamp()) + WEEK)

            await chainSleep(HOUR)
            await chainMine()

            expect(await harvestedTulip["totalSupply()"]()).to.closeTo(
                amountB.add(amountP.div(MAXTIME).mul(WEEK - 2 * HOUR)),
                amountB.div(100)
            )
            expect(
                await harvestedTulip["balanceOf(address)"](alice.address)
            ).to.closeTo(
                amountB.add(amountP.div(MAXTIME).mul(WEEK - 2 * HOUR)),
                amountB.div(100)
            )

            const t0 = await getChainTimestamp()

            for (let i = 0; i < 7; i++) {
                for (let j = 0; j < 24; j++) {
                    await chainSleep(HOUR)
                    await chainMine()
                }

                const dt = (await getChainTimestamp()) - t0

                expect(await harvestedTulip["totalSupply()"]()).to.closeTo(
                    amountB.add(amountP.div(MAXTIME).mul(WEEK - 2 * HOUR - dt)),
                    amountB.div(100)
                )
            }

            await chainSleep(HOUR)

            expect(
                await harvestedTulip["balanceOf(address)"](alice.address)
            ).to.equal(amountB)
        })
    })
})

async function getChainTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber()
    return (await ethers.provider.getBlock(blockNumber)).timestamp
}

async function chainSleep(ms) {
    await hre.network.provider.send("evm_increaseTime", [ms])
}

async function chainMine() {
    await hre.network.provider.send("evm_mine")
}
