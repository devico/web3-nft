// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IERC721 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint);

    function ownerOf(uint tokenId) external view returns (address);

    function saveTransferFrom(address from, address to, uint tokenId, bytes memory data) external;

    function transferFrom(address from, address to, uint tokenId) external;

    function approve(address to, uint tokenId) external;

    function setApprovalFoAll(address operator, bool approved) external;

    function getApproved(uint tokenId) external view returns (address);

    function isApprovedForAll(address owner, address operator) external view returns (bool);
}
