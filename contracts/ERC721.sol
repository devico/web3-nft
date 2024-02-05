// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IERC721.sol";
import "./IERC721Metadata.sol";
import "./IERC721Receiver.sol";
import "./Strings.sol";

/**
 * @title ERC721 Token Implementation
 * @dev This contract implements the ERC721 token standard with metadata extension.
 */
contract ERC721 is IERC721, IERC721Metadata, Ownable {
    using Strings for uint;
    string private _name;
    string private _symbol;
    mapping(address => uint) private _balances;
    mapping(uint => address) private _owners;
    mapping(uint => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    error ZeroAddress();
    error InvalidOwner();
    error NotApprovedOrNotOwner();
    error TransferToNonERC721Receiver();
    error ApproveToSelf();
    error AlreadyMinted();

    /**
     * @dev Modifier to check if the token has been minted.
     * @param tokenId The ID of the token to check.
     */
    modifier _requireMinted(uint tokenId) {
        require(_owners[tokenId] != address(0), "not minted");
        _;
    }

    /**
     * @dev Constructor to initialize the ERC721 token.
     * @param name_ The name of the token.
     * @param symbol_ The symbol of the token.
     */
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev Get the name of the token.
     * @return The name of the token.
     */
    function name() external view returns (string memory) {
        return _name;
    }

    /**
     * @dev Get the symbol of the token.
     * @return The symbol of the token.
     */
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Get the balance of tokens for a specific owner.
     * @param owner The address of the token owner.
     * @return The balance of tokens for the owner.
     */
    function balanceOf(address owner) public view returns (uint) {
        if (owner == address(0)) {
            revert ZeroAddress();
        }

        return _balances[owner];
    }

    /**
     * @dev Get the owner of a specific token.
     * @param tokenId The ID of the token.
     * @return The address of the token owner.
     */
    function ownerOf(uint tokenId) public view _requireMinted(tokenId) returns (address) {
        return _owners[tokenId];
    }

    /**
     * @dev Transfer a token from one address to another.
     * @param from The address transferring the token.
     * @param to The address receiving the token.
     * @param tokenId The ID of the token.
     */
    function transferFrom(address from, address to, uint tokenId) external {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotApprovedOrNotOwner();
        }

        if (ownerOf(tokenId) != from) {
            revert InvalidOwner();
        }

        if (to == address(0)) {
            revert ZeroAddress();
        }

        delete _tokenApprovals[tokenId];

        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Internal function to check if the spender is approved or the owner of the token.
     * @param spender The address to check.
     * @param tokenId The ID of the token.
     * @return True if the spender is approved or the owner of the token, false otherwise.
     */
    function _isApprovedOrOwner(address spender, uint tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);

        return (spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender);
    }

    /**
     * @dev Internal function to perform a token transfer.
     */
    function saveTransferFrom(address from, address to, uint tokenId, bytes memory data) external {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotApprovedOrNotOwner();
        }

        if (ownerOf(tokenId) != from) {
            revert InvalidOwner();
        }

        if (to == address(0)) {
            revert ZeroAddress();
        }

        delete _tokenApprovals[tokenId];

        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        if (!checkOnERC721Received(from, to, tokenId, data)) {
            revert TransferToNonERC721Receiver();
        }
    }

    /**
     * @dev Internal function to check if the receiver is ERC721 compliant.
     */
    function checkOnERC721Received(
        address from,
        address to,
        uint tokenId,
        bytes memory data
    ) public returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (
                bytes4 retval
            ) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Transfer to non ERC721 receiver");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    /**
     * @dev Approve the transfer of a token to another address.
     * @param to The address to approve the transfer to.
     * @param tokenId The ID of the token.
     */
    function approve(address to, uint tokenId) public {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        address _owner = ownerOf(tokenId);

        if (_owner != msg.sender) {
            revert InvalidOwner();
        }

        if (to == _owner) {
            revert ApproveToSelf();
        }

        _tokenApprovals[tokenId] = to;

        emit Approval(_owner, to, tokenId);
    }

    /**
     * @dev Set approval for all tokens to an operator.
     * @param operator The address of the operator.
     * @param approved Whether to approve or revoke operator status.
     */
    function setApprovalFoAll(address operator, bool approved) public {
        if (msg.sender == operator) {
            revert ApproveToSelf();
        }

        _operatorApprovals[msg.sender][operator] = approved;

        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @dev Get the approved address for a specific token.
     * @param tokenId The ID of the token.
     * @return The approved address.
     */
    function getApproved(uint tokenId) public view _requireMinted(tokenId) returns (address) {
        return _tokenApprovals[tokenId];
    }

    /**
     * @dev Check if an operator is approved for all tokens of a specific owner.
     * @param owner The address of the owner.
     * @param operator The address of the operator.
     * @return Whether the operator is approved for all tokens of the owner.
     */
    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @dev Internal function to mint a new token to the given address.
     * @param to The address to mint the token to.
     * @param tokenId The ID of the token to be minted.
     */
    function mint(address to, uint tokenId) external onlyOwner {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        _owners[tokenId] = to;
        _balances[to]++;

        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Public function to burn an existing token.
     * @param tokenId The ID of the token to be burned.
     */
    function burn(uint tokenId) external _requireMinted(tokenId) onlyOwner {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotApprovedOrNotOwner();
        }

        address owner = ownerOf(tokenId);

        delete _tokenApprovals[tokenId];
        _balances[owner]--;
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    /**
     * @dev Get the token URI for a specific token.
     * @param tokenId The ID of the token.
     * @return The token URI.
     */
    function tokenURI(uint tokenId) external view _requireMinted(tokenId) returns (string memory) {
        string memory uri = _baseURI();
        return bytes(uri).length > 0 ? string(abi.encodePacked(uri, tokenId.toString())) : "";
    }

    /**
     * @dev Internal function to get the base URI for token metadata.
     * @return The base URI.
     */
    function _baseURI() internal pure virtual returns (string memory) {
        return "";
    }
}
