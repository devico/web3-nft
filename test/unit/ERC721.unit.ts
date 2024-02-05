import { expect } from "chai"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ERC721 } from "../../typechain"

describe("ERC721 Token", function () {
    let ERC721Contract: ERC721
    let erc721: ERC721
    let owner: SignerWithAddress
    let addr1: SignerWithAddress
    let addr2: SignerWithAddress

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners()

        const ERC721ContractFactory = await ethers.getContractFactory("ERC721")
        ERC721Contract = await ERC721ContractFactory.deploy("MyToken", "MTK")

        await ERC721Contract.deployed()
    })

    describe("name()", function () {
        it("should return correct name", async function () {
            const name = await ERC721Contract.name()
            expect(name).to.equal("MyToken")
        })
    })

    describe("symbol()", function () {
        it("should return correct symbol", async function () {
            const symbol = await ERC721Contract.symbol()
            expect(symbol).to.equal("MTK")
        })
    })

    describe("balanceOf()", function () {
        beforeEach(async function () {
            await ERC721Contract.mint(owner.address, 1)
        })
        it("should return correct balance for the owner", async function () {
            const balance = await ERC721Contract.balanceOf(owner.address)
            expect(balance).to.equal(1)
        })

        it("should return 0 for an address with no tokens", async function () {
            const balance = await ERC721Contract.balanceOf(addr1.address)
            expect(balance).to.equal(0) // Address has no minted tokens
        })

        it("should revert with ZeroAddress error for address(0)", async function () {
            await expect(
                ERC721Contract.balanceOf(ethers.constants.AddressZero)
            ).to.be.revertedWithCustomError(ERC721Contract, "ZeroAddress")
        })
    })

    describe("ownerOf()", function () {
        beforeEach(async function () {
            await ERC721Contract.mint(owner.address, 1)
        })

        it("should return correct owner of a minted token", async function () {
            const tokenId = 1
            const tokenOwner = await ERC721Contract.ownerOf(tokenId)
            expect(tokenOwner).to.equal(owner.address)
        })

        it('should revert with "not minted" error for an unminted token', async function () {
            const tokenId = 2
            await expect(ERC721Contract.ownerOf(tokenId)).to.be.revertedWith("not minted")
        })
    })

    describe("transferFrom()", function () {
        beforeEach(async function () {
            await ERC721Contract.mint(owner.address, 1)
        })

        it("should transfer token to another address when approved", async function () {
            await ERC721Contract.approve(addr1.address, 1)

            const isApproved = await ERC721Contract.getApproved(1)
            expect(isApproved).to.equal(addr1.address)

            await ERC721Contract.connect(addr1).transferFrom(owner.address, addr2.address, 1)

            const newOwner = await ERC721Contract.ownerOf(1)

            expect(newOwner).to.equal(addr2.address)
        })

        it("should revert with NotApprovedOrNotOwner error when transferred by unauthorized address", async function () {
            await expect(
                ERC721Contract.connect(addr1).transferFrom(owner.address, addr2.address, 1)
            ).to.be.revertedWithCustomError(ERC721Contract, "NotApprovedOrNotOwner")
        })

        it("should revert with InvalidOwner error when transferring from a non-owner address", async function () {
            await expect(
                ERC721Contract.transferFrom(addr1.address, addr2.address, 1)
            ).to.be.revertedWithCustomError(ERC721Contract, "InvalidOwner")
        })

        it("should revert with ZeroAddress error when transferring to address(0)", async function () {
            await expect(
                ERC721Contract.transferFrom(owner.address, ethers.constants.AddressZero, 1)
            ).to.be.revertedWithCustomError(ERC721Contract, "ZeroAddress")
        })

        it("should emit Transfer event on successful transfer", async function () {
            const tx = await ERC721Contract.transferFrom(owner.address, addr1.address, 1)

            const receipt = await tx.wait()

            const transferEvent = receipt.events?.find((event) => event.event === "Transfer")

            expect(transferEvent).to.not.be.undefined
            expect(transferEvent?.args?.from).to.equal(owner.address)
            expect(transferEvent?.args?.to).to.equal(addr1.address)
            expect(transferEvent?.args?.tokenId).to.equal(1)
        })
    })

    describe("approve()", function () {
        beforeEach(async function () {
            await ERC721Contract.mint(owner.address, 1)
        })

        it("should approve address to spend a token when called by the owner", async function () {
            await ERC721Contract.connect(owner).approve(addr1.address, 1)

            const isApproved = await ERC721Contract.getApproved(1)
            expect(isApproved).to.equal(addr1.address)
        })

        it("should revert when trying to approve to address(0)", async function () {
            await expect(
                ERC721Contract.connect(owner).approve(ethers.constants.AddressZero, 1)
            ).to.be.revertedWithCustomError(ERC721Contract, "ZeroAddress")
        })

        it("should revert when trying to approve to the owner", async function () {
            await expect(
                ERC721Contract.connect(owner).approve(owner.address, 1)
            ).to.be.revertedWithCustomError(ERC721Contract, "ApproveToSelf")
        })

        it("should revert when called by a non-owner", async function () {
            await expect(
                ERC721Contract.connect(addr1).approve(addr2.address, 1)
            ).to.be.revertedWithCustomError(ERC721Contract, "InvalidOwner")
        })
    })

    describe("saveTransferFrom()", function () {
        beforeEach(async function () {
            await ERC721Contract.mint(owner.address, 1)
        })

        it("should transfer token to another address when approved", async function () {
            const data = "0x";
            await ERC721Contract.approve(addr1.address, 1)
            await ERC721Contract.connect(addr1).saveTransferFrom(
                owner.address,
                addr2.address,
                1,
                data
            )

            const newOwner = await ERC721Contract.ownerOf(1)
            expect(newOwner).to.equal(addr2.address)
        })

        it("should revert when transferring to address(0)", async function () {
            const data = "0x"
            await ERC721Contract.approve(addr1.address, 1)

            await expect(
                ERC721Contract.connect(addr1).saveTransferFrom(
                    owner.address,
                    ethers.constants.AddressZero,
                    1,
                    data
                )
            ).to.be.revertedWithCustomError(ERC721Contract, "ZeroAddress")
        })

        it("should successfully transfer when sender is approved or owner", async function () {
            const tokenId = 1;
            const data = "0x";

            await ERC721Contract.approve(addr1.address, tokenId);
    
            await expect(
                ERC721Contract.saveTransferFrom(owner.address, addr1.address, tokenId, data)
            ).to.not.be.reverted;
    
            expect(await ERC721Contract.ownerOf(tokenId)).to.equal(addr1.address);
        });
    
        it("should revert when the sender is not approved or owner", async function () {
            const tokenId = 2;
            const data = "0x";
        
            await ERC721Contract.mint(owner.address, tokenId);
        
            await expect(
                ERC721Contract.saveTransferFrom(addr1.address, addr2.address, tokenId, data)
            ).to.be.revertedWithCustomError(ERC721Contract, "InvalidOwner");
        
            expect(await ERC721Contract.ownerOf(tokenId)).to.equal(owner.address);
        });
    })

    describe("checkOnERC721Received()", function () {
        it("should return true if receiver supports ERC721", async function () {
            const data = "0x"
            const receiverMockFactory = await ethers.getContractFactory("ERC721ReceiverMock")
            const receiverMock = await receiverMockFactory.deploy()

            const result = await ERC721Contract.callStatic.checkOnERC721Received(
                owner.address,
                receiverMock.address,
                1,
                data
            )
            expect(result).to.be.true
        })

        it("should revert if receiver does not support ERC721", async function () {
            const data = "0x";
            const nonERC721ReceiverFactory = await ethers.getContractFactory("NonERC721Receiver");
            const nonERC721ReceiverInstance = await nonERC721ReceiverFactory.deploy();

            await expect(
                ERC721Contract.checkOnERC721Received(
                    owner.address,
                    nonERC721ReceiverInstance.address,
                    1,
                    data
                )
            ).to.be.revertedWith("Transfer to non ERC721 receiver");
        })

        it("should revert if receiver reverts during onERC721Received", async function () {
            const data = "0x";
            const receiverWithRevert = await ethers.getContractFactory("ERC721ReceiverWithRevert");
            const receiverWithRevertInstance = await receiverWithRevert.deploy();

            await expect(
                ERC721Contract.checkOnERC721Received(owner.address, receiverWithRevertInstance.address, 1, data)
            ).to.be.reverted;
        });
    });

    describe("setApprovalForAll()", function () {
        it("should set approval for the given operator", async function () {
            const approved = true;

            await ERC721Contract.setApprovalFoAll(addr1.address, approved);

            const isApproved = await ERC721Contract.isApprovedForAll(owner.address, addr1.address);
            expect(isApproved).to.equal(approved);
        });

        it("should emit ApprovalForAll event on successful approval", async function () {
            const approved = true;

            const tx = await ERC721Contract.setApprovalFoAll(addr1.address, approved);

            const receipt = await tx.wait();
            const approvalEvent = receipt.events?.find((event) => event.event === "ApprovalForAll");

            expect(approvalEvent).to.not.be.undefined;
            expect(approvalEvent?.args?.owner).to.equal(owner.address);
            expect(approvalEvent?.args?.operator).to.equal(addr1.address);
            expect(approvalEvent?.args?.approved).to.equal(approved);
        });

        it("should revert if owner tries to approve to itself", async function () {
            await expect(
                ERC721Contract.setApprovalFoAll(owner.address, true)
            ).to.be.revertedWithCustomError(ERC721Contract, "ApproveToSelf");
        });
    });

    describe("burn()", function () {
        beforeEach(async function () {
            await ERC721Contract.mint(owner.address, 1)
        })

        it("should update the owner's balance after burning", async function () {
            await ERC721Contract.burn(1);

            const ownerBalance = await ERC721Contract.balanceOf(owner.address);
            expect(ownerBalance).to.equal(0);
        });

        it("should emit Transfer event on successful burn", async function () {
            const tx = await ERC721Contract.burn(1);

            const receipt = await tx.wait();
            const transferEvent = receipt.events?.find((event) => event.event === "Transfer");

            expect(transferEvent).to.not.be.undefined;
            expect(transferEvent?.args?.from).to.equal(owner.address);
            expect(transferEvent?.args?.to).to.equal(ethers.constants.AddressZero);
            expect(transferEvent?.args?.tokenId).to.equal(1);
        });

        it("should revert if trying to burn a non-existent token", async function () {
            const nonExistentTokenId = 999;

            await expect(
                ERC721Contract.burn(nonExistentTokenId)
            ).to.be.revertedWith("not minted");
        });
    });

    describe("tokenURI", function () {
        it("should return an empty string when base URI is not set", async function () {
            const tokenId = 2;
    
            await ERC721Contract.mint(owner.address, tokenId);
    
            const tokenURI = await ERC721Contract.tokenURI(tokenId);
            expect(tokenURI).to.equal("");
        });
    });
})
