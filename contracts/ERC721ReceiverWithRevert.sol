// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC721Receiver.sol";

contract ERC721ReceiverWithRevert is IERC721Receiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("Receiver reverts");
    }
}
