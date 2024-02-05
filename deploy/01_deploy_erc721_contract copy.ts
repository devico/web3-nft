import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify } from "../scripts/helpers/verify"

const deployERC721: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const tokenName = 'DSNToken';
  const tokenSymbol = 'DSNT';
  
  const erc721 = await deploy("ERC721", {
    from: deployer,
    args: [tokenName, tokenSymbol],
    log: true,
    waitConfirmations: 6,
  });

  await verify(erc721.address, [tokenName, tokenSymbol]);
};

export default deployERC721;
deployERC721.tags = ["ERC721"];