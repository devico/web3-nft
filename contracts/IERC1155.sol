// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IERC165.sol";

interface IERC1155 is IERC165 {
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint id,
        uint value
    );

    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint[] ids,
        uint[] values
    );

    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    event URI(string value, uint indexed id);

    function balanceOf(address account, uint id) external view returns (uint);

    function balanceOfBatch(
        address[] memory accounts,
        uint[] memory ids
    ) external view returns (uint[] memory);

    function setApprovalForAll(address operator, bool approved) external;

    function isApprovedForAll(address account, address operator) external view returns (bool);

    function saveTransferFrom(
        address from,
        address to,
        uint id,
        uint amount,
        bytes memory data
    ) external;

    function saveBatchTransferFrom(
        address from,
        address to,
        uint[] memory ids,
        uint[] memory amounts,
        bytes memory data
    ) external;
}
