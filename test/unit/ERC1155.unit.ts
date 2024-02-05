import { expect } from "chai"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ERC1155 } from "../../typechain"

async function deployContract(contractName: string, ...args: any[]) {
    const contractFactory = await ethers.getContractFactory(contractName)
    const contract = await contractFactory.deploy(...args)
    await contract.deployed()
    return contract
}

describe("ERC1155 Token", function () {
    let ERC1155Contract: ERC1155
    let owner: SignerWithAddress
    let addr1: SignerWithAddress
    let addr2: SignerWithAddress

    beforeEach(async function () {
        ;[owner, addr1, addr2] = await ethers.getSigners()

        const ERC1155ContractFactory = await ethers.getContractFactory("ERC1155")
        ERC1155Contract = await ERC1155ContractFactory.deploy(
            "https://example.com/api/token/{id}.json"
        )

        await ERC1155Contract.deployed()
    })

    describe("supportsInterface()", function () {
        it("should return true for ERC1155MetadataURI interface", async function () {
            const result = await ERC1155Contract.supportsInterface("0x0e89341c")
            expect(result).to.be.true
        })
    })

    describe("uri()", function () {
        it("should return the correct URI", async function () {
            const expectedURI = "https://example.com/api/token/{id}.json"
            const result = await ERC1155Contract.uri(1)
            expect(result).to.equal(expectedURI)
        })
    })

    describe("balanceOf()", function () {
        it("should return the correct balance for a token", async function () {
            const tokenId = 1
            const amount = 10

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            const balance = await ERC1155Contract.balanceOf(owner.address, tokenId)
            expect(balance).to.equal(amount)
        })

        it("should revert if balanceOf is called with address(0)", async function () {
            const tokenId = 1

            await expect(
                ERC1155Contract.balanceOf(ethers.constants.AddressZero, tokenId)
            ).to.be.revertedWithCustomError(ERC1155Contract, "ZeroAddress")
        })
    })

    describe("balanceOfBatch()", function () {
        it("should return the correct batch balances", async function () {
            const tokenIds = [1, 2]
            const amounts = [5, 8]

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, "0x")
            await ERC1155Contract.mintBatch(addr1.address, tokenIds, amounts, "0x")

            const batchBalances = await ERC1155Contract.balanceOfBatch(
                [owner.address, addr1.address],
                tokenIds
            )
            expect(batchBalances[0]).to.equal(amounts[0])
            expect(batchBalances[1]).to.equal(amounts[1])
        })

        it("should revert if balanceOfBatch is called with different array lengths", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4]
            const accounts = [owner.address, addr1.address]

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, "0x")

            await expect(
                ERC1155Contract.balanceOfBatch([accounts[0]], tokenIds)
            ).to.be.revertedWithCustomError(ERC1155Contract, "NotEqualNumberIdsAndAccounts")
        })
    })

    describe("setApprovalForAll()", function () {
        it("should set approval for an operator", async function () {
            const operator = addr1.address

            await ERC1155Contract.setApprovalForAll(operator, true)

            const isApproved = await ERC1155Contract.isApprovedForAll(owner.address, operator)
            expect(isApproved).to.be.true
        })

        it("should revert if trying to set approval for self", async function () {
            await expect(
                ERC1155Contract.setApprovalForAll(owner.address, true)
            ).to.be.revertedWithCustomError(ERC1155Contract, "SenderEqualsOperator")
        })
    })

    describe("mint()", function () {
        it("should mint tokens to a recipient", async function () {
            const tokenId = 1
            const amount = 5
            const to = addr1.address

            await ERC1155Contract.mint(to, tokenId, amount, "0x")

            const balance = await ERC1155Contract.balanceOf(to, tokenId)
            expect(balance).to.equal(amount)
        })

        it("should revert if trying to mint to address(0)", async function () {
            const tokenId = 1
            const amount = 5

            await expect(
                ERC1155Contract.mint(ethers.constants.AddressZero, tokenId, amount, "0x")
            ).to.be.revertedWithCustomError(ERC1155Contract, "ZeroAddress")
        })
    })

    describe("mintBatch()", function () {
        it("should revert if mintBatch is called with address(0) as the recipient", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4]
            const data = "0x"

            await expect(
                ERC1155Contract.mintBatch(ethers.constants.AddressZero, tokenIds, amounts, data)
            ).to.be.revertedWithCustomError(ERC1155Contract, "ZeroAddress")
        })

        it("should revert if mintBatch is called with different array lengths for 'ids' and 'amounts'", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4, 5]
            const data = "0x"

            await expect(
                ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, data)
            ).to.be.revertedWithCustomError(ERC1155Contract, "NotEqualNumberIdsAndAmounts")
        })
    })

    describe("burn()", function () {
        it("should burn tokens from a holder", async function () {
            const tokenId = 1
            const amount = 5

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            await ERC1155Contract.burn(owner.address, tokenId, amount)

            const balance = await ERC1155Contract.balanceOf(owner.address, tokenId)
            expect(balance).to.equal(0)
        })

        it("should revert if trying to burn more tokens than held", async function () {
            const tokenId = 1
            const amount = 5

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            await expect(
                ERC1155Contract.burn(owner.address, tokenId, amount + 1)
            ).to.be.revertedWithCustomError(ERC1155Contract, "FromBalanceLessThanAmount")
        })

        it("should revert if trying to burn tokens from address(0)", async function () {
            const tokenId = 1
            const amount = 5

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            await expect(
                ERC1155Contract.burn(ethers.constants.AddressZero, tokenId, amount)
            ).to.be.revertedWithCustomError(ERC1155Contract, "ZeroAddress")
        })
    })

    describe("burnBatch()", function () {
        describe("when burning tokens", function () {
            it("should revert if 'amounts' and 'ids' arrays have different lengths", async function () {
                const tokenIds = [1, 2]
                const amounts = [3, 4, 5]

                await expect(
                    ERC1155Contract.burnBatch(owner.address, tokenIds, amounts)
                ).to.be.revertedWithCustomError(ERC1155Contract, "NotEqualNumberIdsAndAmounts")
            })

            it("should revert if 'from' is address(0)", async function () {
                const tokenIds = [1, 2]
                const amounts = [3, 4]

                await expect(
                    ERC1155Contract.burnBatch(ethers.constants.AddressZero, tokenIds, amounts)
                ).to.be.revertedWithCustomError(ERC1155Contract, "ZeroAddress")
            })

            it("should revert if burning more tokens than held", async function () {
                const tokenId = 1
                const amount = 5

                await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

                await expect(
                    ERC1155Contract.burnBatch(owner.address, [tokenId], [amount + 1])
                ).to.be.revertedWithCustomError(ERC1155Contract, "FromBalanceLessThanAmount")
            })

            it("should burn tokens and emit TransferBatch event", async function () {
                const tokenId = 1
                const amount = 5

                await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

                const tx = await ERC1155Contract.burnBatch(owner.address, [tokenId], [amount])

                const receipt = await tx.wait()

                const transferBatchEvents = receipt?.events?.filter(
                    (event) => event.event === "TransferBatch"
                )

                expect(transferBatchEvents).to.be.an("array")

                if (transferBatchEvents && transferBatchEvents.length > 0) {
                    const transferBatchEvent = transferBatchEvents[0]

                    expect(transferBatchEvent.args).to.not.be.undefined

                    expect(transferBatchEvent.args?.from).to.equal(owner.address)
                    expect(transferBatchEvent.args?.to).to.equal(ethers.constants.AddressZero)
                    expect(transferBatchEvent.args?.ids[0]).to.equal(tokenId)
                }
            })
        })
    })

    describe("saveTransferFrom()", function () {
        it("should transfer tokens from a sender to a recipient", async function () {
            const tokenId = 1
            const amount = 3

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            await ERC1155Contract.saveTransferFrom(
                owner.address,
                addr1.address,
                tokenId,
                amount,
                "0x"
            )

            const balance = await ERC1155Contract.balanceOf(addr1.address, tokenId)
            expect(balance).to.equal(amount)
        })

        it("should revert if trying to transfer more tokens than held", async function () {
            const tokenId = 1
            const amount = 3

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            await expect(
                ERC1155Contract.saveTransferFrom(
                    owner.address,
                    addr1.address,
                    tokenId,
                    amount + 1,
                    "0x"
                )
            ).to.be.revertedWithCustomError(ERC1155Contract, "FromBalanceLessThanAmount")
        })

        it("should revert if trying to transfer tokens to address(0)", async function () {
            const tokenId = 1
            const amount = 3

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            await expect(
                ERC1155Contract.saveTransferFrom(
                    owner.address,
                    ethers.constants.AddressZero,
                    tokenId,
                    amount,
                    "0x"
                )
            ).to.be.revertedWithCustomError(ERC1155Contract, "ZeroAddress")
        })

        it("should revert if saveTransferFrom is called by a different sender than 'from'", async function () {
            const tokenId = 1
            const amount = 3
            const data = "0x"

            await ERC1155Contract.mint(owner.address, tokenId, amount, data)

            await expect(
                ERC1155Contract.connect(addr1).saveTransferFrom(
                    owner.address,
                    addr1.address,
                    tokenId,
                    amount,
                    data
                )
            ).to.be.revertedWithCustomError(ERC1155Contract, "SenderNotEqualsFrom")
        })
    })

    describe("saveBatchTransferFrom()", function () {
        it("should transfer batch of tokens from a sender to a recipient", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4]

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, "0x")

            await ERC1155Contract.saveBatchTransferFrom(
                owner.address,
                addr1.address,
                tokenIds,
                amounts,
                "0x"
            )

            const balance1 = await ERC1155Contract.balanceOf(addr1.address, tokenIds[0])
            const balance2 = await ERC1155Contract.balanceOf(addr1.address, tokenIds[1])

            expect(balance1).to.equal(amounts[0])
            expect(balance2).to.equal(amounts[1])
        })

        it("should revert if trying to transfer batch with more tokens than held", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4]

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, "0x")

            await expect(
                ERC1155Contract.saveBatchTransferFrom(
                    owner.address,
                    addr1.address,
                    tokenIds,
                    [4, 5],
                    "0x"
                )
            ).to.be.revertedWithCustomError(ERC1155Contract, "FromBalanceLessThanAmount")
        })

        it("should revert if trying to transfer batch from address(0)", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4]

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, "0x")

            await expect(
                ERC1155Contract.saveBatchTransferFrom(
                    ethers.constants.AddressZero,
                    addr1.address,
                    tokenIds,
                    amounts,
                    "0x"
                )
            ).to.be.revertedWithCustomError(ERC1155Contract, "SenderNotEqualsFrom")
        })

        it("should revert if saveBatchTransferFrom is called with 'to' being address(0)", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4]
            const data = "0x"

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, data)

            await expect(
                ERC1155Contract.saveBatchTransferFrom(
                    owner.address,
                    ethers.constants.AddressZero,
                    tokenIds,
                    amounts,
                    data
                )
            ).to.be.revertedWithCustomError(ERC1155Contract, "ZeroAddress")
        })

        it("should revert if saveBatchTransferFrom is called with different array lengths for 'ids' and 'amounts'", async function () {
            const tokenIds = [1, 2]
            const amounts = [3, 4, 5]
            const data = "0x"

            await expect(
                ERC1155Contract.saveBatchTransferFrom(
                    owner.address,
                    addr1.address,
                    tokenIds,
                    amounts,
                    data
                )
            ).to.be.revertedWithCustomError(ERC1155Contract, "NotEqualNumberIdsAndAmounts")
        })
    })

    describe("_doSafeTransferAcceptanceCheck", function () {
        it("should revert if 'to' address is a contract and onERC1155Received returns an unexpected value", async function () {
            const tokenId = 1
            const amount = 5

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            const nonCompliantReceiver = await deployContract("NonERC1155Receiver")

            await expect(
                ERC1155Contract._doSafeTransferAcceptanceCheck(
                    addr1.address,
                    owner.address,
                    nonCompliantReceiver.address,
                    tokenId,
                    amount,
                    "0x"
                )
            ).to.be.revertedWith("Non-ERC1155 receiver")
        })

        it("should revert if 'to' address is a contract and onERC1155Received reverts", async function () {
            const tokenId = 1
            const amount = 5

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            const revertingReceiver = await deployContract("RevertingERC1155Receiver")

            await expect(
                ERC1155Contract._doSafeTransferAcceptanceCheck(
                    addr1.address,
                    owner.address,
                    revertingReceiver.address,
                    tokenId,
                    amount,
                    "0x"
                )
            ).to.be.revertedWith("Non-ERC1155 receiver")
        })

        it("should revert if 'to' address is a non-ERC1155 receiver contract", async function () {
            const tokenId = 1
            const amount = 5

            await ERC1155Contract.mint(owner.address, tokenId, amount, "0x")

            const nonERC1155Receiver = await deployContract("NonERC1155Receiver")

            await expect(
                ERC1155Contract._doSafeTransferAcceptanceCheck(
                    addr1.address,
                    owner.address,
                    nonERC1155Receiver.address,
                    tokenId,
                    amount,
                    "0x"
                )
            ).to.be.revertedWith("Non-ERC1155 receiver")
        })
    })

    describe("_doSafeBatchTransferAcceptanceCheck", function () {
        it("should revert if 'to' address is a contract and onERC1155BatchReceived returns an unexpected value", async function () {
            const tokenIds = [1, 2]
            const amounts = [5, 10]

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, "0x")

            const nonCompliantReceiver = await deployContract("NonERC1155BatchReceiver")

            await expect(
                ERC1155Contract._doSafeBatchTransferAcceptanceCheck(
                    addr1.address,
                    owner.address,
                    nonCompliantReceiver.address,
                    tokenIds,
                    amounts,
                    "0x"
                )
            ).to.be.revertedWith("Non-ERC1155 receiver")
        })

        it("should not revert if 'to' is not a contract", async function () {
            const tokenIds = [1, 2]
            const amounts = [5, 10]

            await ERC1155Contract.mintBatch(owner.address, tokenIds, amounts, "0x")

            await expect(
                ERC1155Contract._doSafeBatchTransferAcceptanceCheck(
                    addr1.address,
                    owner.address,
                    addr2.address,
                    tokenIds,
                    amounts,
                    "0x"
                )
            ).to.not.be.reverted
        })
    })
})
