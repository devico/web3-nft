// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IERC1155MetadataURI.sol";
import "./IERC1155.sol";
import "./IERC1155Receiver.sol";
import "./ERC165.sol";

contract ERC1155 is ERC165, IERC1155, IERC1155MetadataURI, Ownable {
    mapping(uint => mapping(address => uint)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    string private _uri;

    error ZeroAddress();
    error NotEqualNumberIdsAndAccounts();
    error NotEqualNumberIdsAndAmounts();
    error SenderEqualsOperator();
    error SenderNotEqualsFrom();
    error FromBalanceLessThanAmount();

    constructor(string memory uri_) {
        _setURI(uri_);
    }

    /**
     * @dev Queries whether the contract supports a specific interface.
     * @param interfaceId The interface identifier, as specified in ERC-165.
     * @return A boolean indicating whether the contract supports the given interface.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(IERC1155MetadataURI).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Gets the Uniform Resource Identifier (URI) for a specific token ID.
     * @param id The token ID for which to retrieve the URI. (Unused parameter)
     * @return A string representing the URI for the specified token ID.
     * @notice The 'id' parameter is not used in this implementation but is kept for compatibility with the ERC1155MetadataURI interface.
     */
    function uri(uint id) public view virtual returns (string memory) {
        return _uri;
    }

    /**
     * @dev Gets the balance of a specific account for a given token ID.
     * @param account The address of the account to query.
     * @param id The token ID for which to retrieve the balance.
     * @return The balance of the specified account for the specified token ID.
     */
    function balanceOf(address account, uint id) public view virtual returns (uint) {
        if (account == address(0)) {
            revert ZeroAddress();
        }

        return _balances[id][account];
    }

    /**
     * @dev Gets the balance of multiple accounts for a given array of token IDs.
     * @param accounts The addresses of the accounts to query.
     * @param ids The array of token IDs for which to retrieve the balances.
     * @return batchBalances An array containing the balances of the specified accounts for the corresponding token IDs.
     */
    function balanceOfBatch(
        address[] memory accounts,
        uint[] memory ids
    ) public view virtual returns (uint[] memory batchBalances) {
        if (accounts.length != ids.length) {
            revert NotEqualNumberIdsAndAccounts();
        }

        batchBalances = new uint[](accounts.length);

        for (uint i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }
    }

    /**
     * @dev Sets or revokes approval for a given operator to manage all tokens of the caller.
     * @param operator The address of the operator for whom approval is (or is not) being set.
     * @param approved A boolean indicating whether to approve (`true`) or revoke (`false`) the operator.
     */
    function setApprovalForAll(address operator, bool approved) external {
        if (msg.sender == operator) {
            revert SenderEqualsOperator();
        }

        _operatorApprovals[msg.sender][operator] = approved;

        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @dev Checks whether a given operator is approved to manage all tokens of a specific account.
     * @param account The address of the account owner for whom the approval status is being checked.
     * @param operator The address of the operator whose approval status is being checked.
     * @return A boolean indicating whether the operator is approved (`true`) or not (`false`).
     */
    function isApprovedForAll(
        address account,
        address operator
    ) public view virtual returns (bool) {
        return _operatorApprovals[account][operator];
    }

    /**
     * @dev Safely transfers a specified amount of a token from one address to another.
     * @param from The address from which the tokens will be transferred.
     * @param to The address to which the tokens will be transferred.
     * @param id The identifier of the token being transferred.
     * @param amount The amount of tokens to transfer.
     * @param data Additional data with no specified format, sent in the `onERC1155Received` call to the receiver.
     */
    function saveTransferFrom(
        address from,
        address to,
        uint id,
        uint amount,
        bytes memory data
    ) public virtual {
        if (from != msg.sender) {
            revert SenderNotEqualsFrom();
        }

        if (to == address(0)) {
            revert ZeroAddress();
        }

        address operator = msg.sender;

        uint fromBalance = _balances[id][from];

        if (fromBalance < amount) {
            revert FromBalanceLessThanAmount();
        }

        _balances[id][from] = fromBalance - amount;
        _balances[id][to] += amount;

        emit TransferSingle(operator, from, to, id, amount);

        _doSafeTransferAcceptanceCheck(operator, from, to, id, amount, data);
    }

    /**
     * @dev Safely transfers specified amounts of multiple tokens from one address to another.
     * @param from The address from which the tokens will be transferred.
     * @param to The address to which the tokens will be transferred.
     * @param ids An array of identifiers of the tokens being transferred.
     * @param amounts An array specifying the amounts of tokens to transfer for each corresponding `id`.
     * @param data Additional data with no specified format, sent in the `onERC1155BatchReceived` call to the receiver.
     */
    function saveBatchTransferFrom(
        address from,
        address to,
        uint[] memory ids,
        uint[] memory amounts,
        bytes memory data
    ) public virtual {
        if (from != msg.sender) {
            revert SenderNotEqualsFrom();
        }

        if (amounts.length != ids.length) {
            revert NotEqualNumberIdsAndAmounts();
        }

        if (to == address(0)) {
            revert ZeroAddress();
        }

        address operator = msg.sender;

        for (uint i = 0; i < ids.length; ++i) {
            uint id = ids[i];

            uint amount = amounts[i];

            uint fromBalance = _balances[id][from];

            if (fromBalance < amount) {
                revert FromBalanceLessThanAmount();
            }

            _balances[id][from] = fromBalance - amount;
            _balances[id][to] += amount;
        }

        emit TransferBatch(operator, from, to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(operator, from, to, ids, amounts, data);
    }

    /**
     * @dev Sets the URI prefix for all token IDs.
     * @param newURI The new URI prefix to set.
     */
    function _setURI(string memory newURI) internal virtual {
        _uri = newURI;
    }

    /**
     * @dev Performs a safe transfer acceptance check for ERC1155 tokens.
     * @param operator The address that is performing the transfer.
     * @param from The address from which the tokens are transferred.
     * @param to The address to which the tokens are transferred.
     * @param id The ID of the token being transferred.
     * @param amount The amount of tokens being transferred.
     * @param data Additional data with no specified format.
     */
    function _doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint id,
        uint amount,
        bytes memory data
    ) public {
        if (to.code.length > 0) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (
                bytes4 response
            ) {
                if (response != IERC1155Receiver.onERC1155Received.selector) {
                    revert("Reject tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("Non-ERC1155 receiver");
            }
        }
    }

    /**
     * @dev Performs a safe batch transfer acceptance check for ERC1155 tokens.
     * @param operator The address that is performing the transfer.
     * @param from The address from which the tokens are transferred.
     * @param to The address to which the tokens are transferred.
     * @param ids An array of IDs of the tokens being transferred.
     * @param amounts An array of amounts corresponding to the IDs being transferred.
     * @param data Additional data with no specified format.
     */
    function _doSafeBatchTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint[] memory ids,
        uint[] memory amounts,
        bytes memory data
    ) public {
        if (to.code.length > 0) {
            try
                IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data)
            returns (bytes4 response) {
                if (response != IERC1155Receiver.onERC1155BatchReceived.selector) {
                    revert("Non-ERC1155 receiver");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("Non-ERC1155 receiver");
            }
        }
    }

    /**
     * @dev Mints a specified amount of a token to the given address.
     * @param to The address to which the tokens will be minted.
     * @param id The identifier of the token being minted.
     * @param amount The amount of tokens to mint.
     * @param data Data to pass along to the receiver contract's `onERC1155Received` function.
     */
    function mint(address to, uint id, uint amount, bytes memory data) external onlyOwner {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        address operator = msg.sender;

        _balances[id][to] += amount;

        emit TransferSingle(operator, address(0), to, id, amount);

        _doSafeTransferAcceptanceCheck(operator, address(0), to, id, amount, data);
    }

    /**
     * @notice Mint multiple tokens and assign them to a specified address.
     * @dev Only the owner of the contract can call this function.
     * @param to The address to which the tokens will be minted.
     * @param ids An array of token IDs to be minted.
     * @param amounts An array specifying the amount of each corresponding token ID to mint.
     * @param data Data to pass along to the onERC1155BatchReceived hook if recipient is a contract.
     */
    function mintBatch(
        address to,
        uint[] memory ids,
        uint[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        if (amounts.length != ids.length) {
            revert NotEqualNumberIdsAndAmounts();
        }

        address operator = msg.sender;

        for (uint i = 0; i < ids.length; ++i) {
            _balances[ids[i]][to] += amounts[i];
        }

        emit TransferBatch(operator, address(0), to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(operator, address(0), to, ids, amounts, data);
    }

    /**
     * @dev Burns a specified amount of a token from the given address.
     * @param from The address from which the tokens will be burned.
     * @param id The identifier of the token being burned.
     * @param amount The amount of tokens to burn.
     */
    function burn(address from, uint id, uint amount) external onlyOwner {
        if (from == address(0)) {
            revert ZeroAddress();
        }

        address operator = msg.sender;

        uint fromBalance = _balances[id][from];

        if (fromBalance < amount) {
            revert FromBalanceLessThanAmount();
        }

        _balances[id][from] = fromBalance - amount;

        emit TransferSingle(operator, from, address(0), id, amount);
    }

    /**
     * @notice Burn multiple tokens owned by a specified address.
     * @dev Only the owner of the contract can call this function.
     * @param from The address from which the tokens will be burned.
     * @param ids An array of token IDs to be burned.
     * @param amounts An array specifying the amount of each corresponding token ID to burn.
     */
    function burnBatch(address from, uint[] memory ids, uint[] memory amounts) external onlyOwner {
        if (amounts.length != ids.length) {
            revert NotEqualNumberIdsAndAmounts();
        }

        if (from == address(0)) {
            revert ZeroAddress();
        }

        address operator = msg.sender;

        for (uint i = 0; i < ids.length; ++i) {
            uint id = ids[i];

            uint amount = amounts[i];

            uint fromBalance = _balances[id][from];

            if (fromBalance < amount) {
                revert FromBalanceLessThanAmount();
            }

            _balances[id][from] = fromBalance - amount;
        }

        emit TransferBatch(operator, from, address(0), ids, amounts);
    }
}
