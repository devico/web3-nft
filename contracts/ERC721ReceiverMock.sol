// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC721Receiver.sol";

contract ERC721ReceiverMock is IERC721Receiver {
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return _ERC721_RECEIVED;
    }
}
