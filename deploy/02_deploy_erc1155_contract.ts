import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify } from "../scripts/helpers/verify"

const deployERC1155: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const uri = 'https://example.com/api/token/{id}.json';
  
  const erc1155 = await deploy("ERC1155", {
    from: deployer,
    args: [uri],
    log: true,
    waitConfirmations: 6,
  });

  await verify(erc1155.address, [uri]);
};

export default deployERC1155;
deployERC1155.tags = ["ERC1155"];