// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEquityToken
 * @notice Interface for the Equity Token contract used in CrowdMantle
 * @dev ERC20 token with minting capability restricted to the escrow contract
 */
interface IEquityToken {
    /**
     * @notice Mint tokens to a specific address
     * @dev Can only be called by the escrow contract
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint (in wei)
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice Get the escrow contract address
     * @return Address of the escrow contract that can mint tokens
     */
    function escrowContract() external view returns (address);

    /**
     * @notice Get the campaign ID this token belongs to
     * @return Campaign ID in the escrow contract
     */
    function campaignId() external view returns (uint256);
}
