// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EquityToken.sol";

/**
 * @title CrowdfundingEscrow
 * @notice Escrow-based crowdfunding contract for CrowdMantle platform
 * @dev Holds MNT in escrow until campaign deadline
 *      - Success: Creator claims funds (minus 2% fee), investors claim tokens
 *      - Failure: Investors get full refund, no tokens issued
 *
 * Network: Mantle Sepolia Testnet (Chain ID: 5003)
 * Token: Native MNT
 */
contract CrowdfundingEscrow is ReentrancyGuard, Ownable {
    // ============ Structs ============

    struct Campaign {
        address creator;          // Project creator address
        uint256 goal;             // Funding goal in MNT (wei)
        uint256 pledged;          // Current pledged amount
        uint256 startAt;          // Campaign start timestamp
        uint256 endAt;            // Campaign end timestamp
        bool claimed;             // Whether creator has claimed funds
        address equityToken;      // Deployed EquityToken contract address
        string name;              // Campaign name
        string tokenSymbol;       // Token symbol
        uint256 founderShareBps;  // Founder's token share in basis points (max 3000 = 30%)
        bool founderTokensClaimed; // Whether founder has claimed tokens
    }

    // ============ State Variables ============

    /// @notice Total number of campaigns created
    uint256 public campaignCount;

    /// @notice Platform fee in basis points (200 = 2%)
    uint256 public constant PLATFORM_FEE_BPS = 200;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Minimum campaign duration in days
    uint256 public constant MIN_DURATION_DAYS = 1;

    /// @notice Maximum campaign duration in days
    uint256 public constant MAX_DURATION_DAYS = 60;

    /// @notice Minimum funding goal in MNT (0.1 MNT)
    uint256 public constant MIN_GOAL = 0.1 ether;

    /// @notice Maximum founder share in basis points (3000 = 30%)
    uint256 public constant MAX_FOUNDER_SHARE_BPS = 3000;

    /// @notice Platform wallet address for fee collection
    address public platformWallet;

    /// @notice Campaign ID => Campaign data
    mapping(uint256 => Campaign) public campaigns;

    /// @notice Campaign ID => Investor => Pledge amount
    mapping(uint256 => mapping(address => uint256)) public pledges;

    /// @notice Campaign ID => Investor => Whether tokens have been claimed
    mapping(uint256 => mapping(address => bool)) public tokensClaimed;

    // ============ Events ============

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 goal,
        uint256 startAt,
        uint256 endAt,
        address equityToken,
        string name,
        string tokenSymbol
    );

    event Pledged(
        uint256 indexed campaignId,
        address indexed investor,
        uint256 amount,
        uint256 totalPledged
    );

    event Unpledged(
        uint256 indexed campaignId,
        address indexed investor,
        uint256 amount,
        uint256 totalPledged
    );

    event Claimed(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 grossAmount,
        uint256 platformFee,
        uint256 netAmount
    );

    event Refunded(
        uint256 indexed campaignId,
        address indexed investor,
        uint256 amount
    );

    event TokensClaimed(
        uint256 indexed campaignId,
        address indexed investor,
        uint256 amount
    );

    event FounderTokensClaimed(
        uint256 indexed campaignId,
        address indexed founder,
        uint256 amount
    );

    event PlatformWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet
    );

    // ============ Errors ============

    error InvalidGoal();
    error InvalidDuration();
    error CampaignNotFound();
    error CampaignNotActive();
    error CampaignNotEnded();
    error CampaignEnded();
    error GoalNotReached();
    error GoalReached();
    error AlreadyClaimed();
    error NoPledge();
    error TokensAlreadyClaimed();
    error InsufficientPledge();
    error NotCampaignCreator();
    error TransferFailed();
    error ZeroAmount();
    error InvalidPlatformWallet();
    error InvalidFounderShare();
    error FounderTokensAlreadyClaimed();

    // ============ Constructor ============

    /**
     * @notice Initialize the escrow contract
     * @param _platformWallet Address to receive platform fees
     */
    constructor(address _platformWallet) Ownable(msg.sender) {
        if (_platformWallet == address(0)) revert InvalidPlatformWallet();
        platformWallet = _platformWallet;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new crowdfunding campaign
     * @dev Deploys a new EquityToken contract for the campaign
     * @param _goal Funding goal in MNT (wei)
     * @param _durationDays Campaign duration in days (7-60)
     * @param _name Campaign/project name
     * @param _tokenName Name for the equity token
     * @param _tokenSymbol Symbol for the equity token
     * @param _founderShareBps Founder's token share in basis points (0-3000, max 30%)
     * @return campaignId The ID of the newly created campaign
     */
    function createCampaign(
        uint256 _goal,
        uint256 _durationDays,
        string calldata _name,
        string calldata _tokenName,
        string calldata _tokenSymbol,
        uint256 _founderShareBps
    ) external returns (uint256 campaignId) {
        // Validate inputs
        if (_goal < MIN_GOAL) revert InvalidGoal();
        if (_durationDays < MIN_DURATION_DAYS || _durationDays > MAX_DURATION_DAYS) {
            revert InvalidDuration();
        }
        if (_founderShareBps > MAX_FOUNDER_SHARE_BPS) revert InvalidFounderShare();

        // Generate campaign ID
        campaignId = campaignCount;
        campaignCount++;

        // Calculate timestamps
        uint256 startAt = block.timestamp;
        uint256 endAt = startAt + (_durationDays * 1 days);

        // Deploy EquityToken for this campaign
        EquityToken equityToken = new EquityToken(
            _tokenName,
            _tokenSymbol,
            address(this),
            campaignId
        );

        // Store campaign data
        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            goal: _goal,
            pledged: 0,
            startAt: startAt,
            endAt: endAt,
            claimed: false,
            equityToken: address(equityToken),
            name: _name,
            tokenSymbol: _tokenSymbol,
            founderShareBps: _founderShareBps,
            founderTokensClaimed: false
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _goal,
            startAt,
            endAt,
            address(equityToken),
            _name,
            _tokenSymbol
        );
    }

    /**
     * @notice Pledge MNT to a campaign
     * @dev MNT is held in escrow until campaign ends
     * @param _campaignId ID of the campaign to pledge to
     */
    function pledge(uint256 _campaignId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (block.timestamp >= campaign.endAt) revert CampaignEnded();

        // Update pledge tracking
        pledges[_campaignId][msg.sender] += msg.value;
        campaign.pledged += msg.value;

        emit Pledged(_campaignId, msg.sender, msg.value, campaign.pledged);
    }

    /**
     * @notice Withdraw pledge before campaign ends
     * @dev Only allowed before deadline
     * @param _campaignId ID of the campaign
     * @param _amount Amount to withdraw (in wei)
     */
    function unpledge(uint256 _campaignId, uint256 _amount) external nonReentrant {
        if (_amount == 0) revert ZeroAmount();

        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (block.timestamp >= campaign.endAt) revert CampaignEnded();

        uint256 pledged = pledges[_campaignId][msg.sender];
        if (pledged < _amount) revert InsufficientPledge();

        // Update pledge tracking
        pledges[_campaignId][msg.sender] -= _amount;
        campaign.pledged -= _amount;

        // Transfer MNT back to investor
        (bool success, ) = msg.sender.call{value: _amount}("");
        if (!success) revert TransferFailed();

        emit Unpledged(_campaignId, msg.sender, _amount, campaign.pledged);
    }

    /**
     * @notice Claim funds after successful campaign
     * @dev Only creator can call, only after deadline if goal reached
     *      Platform fee (2%) is deducted and sent to platform wallet
     * @param _campaignId ID of the campaign
     */
    function claim(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.creator) revert NotCampaignCreator();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged < campaign.goal) revert GoalNotReached();
        if (campaign.claimed) revert AlreadyClaimed();

        // Mark as claimed
        campaign.claimed = true;

        // Calculate amounts
        uint256 grossAmount = campaign.pledged;
        uint256 platformFee = (grossAmount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = grossAmount - platformFee;

        // Transfer platform fee
        (bool feeSuccess, ) = platformWallet.call{value: platformFee}("");
        if (!feeSuccess) revert TransferFailed();

        // Transfer net amount to creator
        (bool success, ) = campaign.creator.call{value: netAmount}("");
        if (!success) revert TransferFailed();

        emit Claimed(_campaignId, campaign.creator, grossAmount, platformFee, netAmount);
    }

    /**
     * @notice Claim equity tokens after successful campaign
     * @dev Investors call this to receive tokens equal to their pledge
     *      Only available after creator has claimed (campaign successful)
     * @param _campaignId ID of the campaign
     */
    function claimTokens(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged < campaign.goal) revert GoalNotReached();
        if (!campaign.claimed) revert NotCampaignCreator(); // Creator must claim first

        uint256 pledged = pledges[_campaignId][msg.sender];
        if (pledged == 0) revert NoPledge();
        if (tokensClaimed[_campaignId][msg.sender]) revert TokensAlreadyClaimed();

        // Mark tokens as claimed
        tokensClaimed[_campaignId][msg.sender] = true;

        // Mint equity tokens to investor
        EquityToken(campaign.equityToken).mint(msg.sender, pledged);

        emit TokensClaimed(_campaignId, msg.sender, pledged);
    }

    /**
     * @notice Claim founder tokens after successful campaign
     * @dev Only creator can call, only after campaign succeeds
     *      Founder receives tokens based on their share percentage
     *      Example: If founderShareBps = 2000 (20%) and investors pledged 1000 MNT,
     *               founder receives 250 tokens (1000 * 20 / 80 = 250)
     *               Total supply becomes 1000 + 250 = 1250
     * @param _campaignId ID of the campaign
     */
    function claimFounderTokens(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.creator) revert NotCampaignCreator();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged < campaign.goal) revert GoalNotReached();
        if (!campaign.claimed) revert NotCampaignCreator(); // Creator must claim funds first
        if (campaign.founderTokensClaimed) revert FounderTokensAlreadyClaimed();
        if (campaign.founderShareBps == 0) revert ZeroAmount(); // No founder share set

        // Mark founder tokens as claimed
        campaign.founderTokensClaimed = true;

        // Calculate founder token amount
        // Formula: founderTokens = pledged * founderShareBps / (BPS_DENOMINATOR - founderShareBps)
        // This ensures founder gets exactly founderShareBps% of TOTAL supply
        // e.g., 20% share: 1000 * 2000 / (10000 - 2000) = 1000 * 2000 / 8000 = 250
        // Total = 1000 + 250 = 1250, founder has 250/1250 = 20%
        uint256 founderTokens = (campaign.pledged * campaign.founderShareBps) /
                                (BPS_DENOMINATOR - campaign.founderShareBps);

        // Mint founder tokens
        EquityToken(campaign.equityToken).mint(campaign.creator, founderTokens);

        emit FounderTokensClaimed(_campaignId, campaign.creator, founderTokens);
    }

    /**
     * @notice Refund pledge after failed campaign
     * @dev Only available after deadline if goal not reached
     *      Full refund, no fees
     * @param _campaignId ID of the campaign
     */
    function refund(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged >= campaign.goal) revert GoalReached();

        uint256 pledged = pledges[_campaignId][msg.sender];
        if (pledged == 0) revert NoPledge();

        // Clear pledge (before transfer to prevent reentrancy)
        pledges[_campaignId][msg.sender] = 0;

        // Transfer full refund
        (bool success, ) = msg.sender.call{value: pledged}("");
        if (!success) revert TransferFailed();

        emit Refunded(_campaignId, msg.sender, pledged);
    }

    // ============ View Functions ============

    /**
     * @notice Get campaign details
     * @param _campaignId ID of the campaign
     * @return Campaign struct data
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    /**
     * @notice Get pledge amount for an investor
     * @param _campaignId ID of the campaign
     * @param _investor Address of the investor
     * @return Pledge amount in wei
     */
    function getPledge(uint256 _campaignId, address _investor) external view returns (uint256) {
        return pledges[_campaignId][_investor];
    }

    /**
     * @notice Check if campaign funding was successful
     * @param _campaignId ID of the campaign
     * @return True if goal was reached after deadline
     */
    function isCampaignSuccessful(uint256 _campaignId) external view returns (bool) {
        Campaign storage campaign = campaigns[_campaignId];
        return block.timestamp >= campaign.endAt && campaign.pledged >= campaign.goal;
    }

    /**
     * @notice Check if campaign has ended
     * @param _campaignId ID of the campaign
     * @return True if past deadline
     */
    function isCampaignEnded(uint256 _campaignId) external view returns (bool) {
        return block.timestamp >= campaigns[_campaignId].endAt;
    }

    /**
     * @notice Get time remaining until campaign ends
     * @param _campaignId ID of the campaign
     * @return Seconds remaining (0 if ended)
     */
    function getTimeRemaining(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        if (block.timestamp >= campaign.endAt) return 0;
        return campaign.endAt - block.timestamp;
    }

    /**
     * @notice Calculate funding progress percentage
     * @param _campaignId ID of the campaign
     * @return Percentage (0-100+, can exceed 100)
     */
    function getFundingProgress(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.goal == 0) return 0;
        return (campaign.pledged * 100) / campaign.goal;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform wallet address
     * @dev Only owner can call
     * @param _newWallet New platform wallet address
     */
    function updatePlatformWallet(address _newWallet) external onlyOwner {
        if (_newWallet == address(0)) revert InvalidPlatformWallet();
        address oldWallet = platformWallet;
        platformWallet = _newWallet;
        emit PlatformWalletUpdated(oldWallet, _newWallet);
    }

    // ============ Receive Function ============

    /// @notice Reject direct MNT transfers (must use pledge function)
    receive() external payable {
        revert("Use pledge() function");
    }
}
