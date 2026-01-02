// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title EquityToken
 * @notice ERC20 token representing equity in a crowdfunded project
 * @dev Deployed by CrowdfundingEscrow for each campaign
 *      Only the escrow contract can mint tokens (after successful funding)
 *      1 MNT invested = 1 EquityToken (1:1 ratio)
 */
contract EquityToken is ERC20 {
    /// @notice Address of the escrow contract that deployed this token
    address public immutable escrowContract;

    /// @notice Campaign ID this token belongs to
    uint256 public immutable campaignId;

    /// @notice Error when caller is not the escrow contract
    error OnlyEscrowContract();

    /// @notice Modifier to restrict function access to escrow contract only
    modifier onlyEscrow() {
        if (msg.sender != escrowContract) revert OnlyEscrowContract();
        _;
    }

    /**
     * @notice Constructor sets the token name, symbol, and escrow contract
     * @param _name Token name (e.g., "TechStartup Equity")
     * @param _symbol Token symbol (e.g., "TECH")
     * @param _escrowContract Address of the CrowdfundingEscrow contract
     * @param _campaignId ID of the campaign in the escrow contract
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _escrowContract,
        uint256 _campaignId
    ) ERC20(_name, _symbol) {
        escrowContract = _escrowContract;
        campaignId = _campaignId;
    }

    /**
     * @notice Mint tokens to an investor after successful funding
     * @dev Can only be called by the escrow contract
     *      Called when investor claims their tokens after campaign success
     * @param to Address to receive the tokens (investor)
     * @param amount Amount of tokens to mint (equal to MNT invested)
     */
    function mint(address to, uint256 amount) external onlyEscrow {
        _mint(to, amount);
    }

    /**
     * @notice Returns the number of decimals (18, same as MNT)
     * @return Number of decimals
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
