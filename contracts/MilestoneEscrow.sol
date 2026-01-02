// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EquityToken.sol";

/**
 * @title MilestoneEscrow
 * @notice Escrow contract with milestone-based fund release for CrowdMantle
 * @dev Extends crowdfunding with phased fund release tied to governance votes
 *
 * Key Features:
 * - Milestone-gated fund release (up to 3 milestones)
 * - Governance vote required for each milestone approval
 * - Emergency refund mechanism for failed milestones
 * - 2% platform fee applied per milestone release
 *
 * Network: Mantle Sepolia Testnet (Chain ID: 5003)
 */
contract MilestoneEscrow is ReentrancyGuard, Ownable {
    // ============ Enums ============

    enum MilestoneStatus {
        Pending,    // Not yet submitted for approval
        Voting,     // Governance proposal created, voting in progress
        Approved,   // Vote passed, funds can be released
        Rejected,   // Vote failed
        Released    // Funds released to creator
    }

    // ============ Structs ============

    struct Milestone {
        string title;
        string description;
        uint256 percentage;      // Basis points (3000 = 30%)
        uint256 deadline;        // Unix timestamp
        MilestoneStatus status;
        uint256 proposalId;      // Linked governance proposal ID (0 if none)
    }

    struct Campaign {
        address creator;
        uint256 goal;
        uint256 pledged;
        uint256 startAt;
        uint256 endAt;
        bool claimed;              // Deprecated for milestone campaigns
        address equityToken;
        string name;
        string tokenSymbol;
        uint256 founderShareBps;
        bool founderTokensClaimed;
        // Milestone-specific fields
        uint256 milestoneCount;
        uint256 releasedAmount;
        bool hasMilestones;
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

    /// @notice Maximum milestones per campaign
    uint256 public constant MAX_MILESTONES = 3;

    /// @notice Platform wallet address for fee collection
    address public platformWallet;

    /// @notice Governance contract address for milestone approvals
    address public governanceContract;

    /// @notice Campaign ID => Campaign data
    mapping(uint256 => Campaign) public campaigns;

    /// @notice Campaign ID => Milestone Index => Milestone data
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

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
        string tokenSymbol,
        bool hasMilestones,
        uint256 milestoneCount
    );

    event MilestoneCreated(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        string title,
        uint256 percentage,
        uint256 deadline
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

    event MilestoneSubmitted(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        uint256 proposalId
    );

    event MilestoneStatusChanged(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        MilestoneStatus newStatus
    );

    event MilestoneFundsReleased(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        uint256 grossAmount,
        uint256 platformFee,
        uint256 netAmount
    );

    event Refunded(
        uint256 indexed campaignId,
        address indexed investor,
        uint256 amount
    );

    event EmergencyRefundEnabled(
        uint256 indexed campaignId,
        uint256 refundableAmount
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

    event GovernanceContractUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    event PlatformWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet
    );

    // ============ Errors ============

    error InvalidGoal();
    error InvalidDuration();
    error InvalidMilestoneCount();
    error PercentagesMustSumTo100();
    error DeadlinesNotAscending();
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
    error MilestoneNotFound();
    error MilestoneNotPending();
    error MilestoneAlreadySubmitted();
    error MilestoneNotApproved();
    error MilestoneFundsAlreadyReleased();
    error PreviousMilestoneNotCompleted();
    error MilestoneDeadlinePassed();
    error GovernanceContractNotSet();
    error OnlyGovernanceContract();
    error NotMilestoneCampaign();
    error IsMilestoneCampaign();
    error NoMilestonesRejected();

    // ============ Modifiers ============

    modifier onlyGovernance() {
        if (msg.sender != governanceContract) revert OnlyGovernanceContract();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the milestone escrow contract
     * @param _platformWallet Address to receive platform fees
     */
    constructor(address _platformWallet) Ownable(msg.sender) {
        if (_platformWallet == address(0)) revert InvalidPlatformWallet();
        platformWallet = _platformWallet;
    }

    // ============ External Functions ============

    /**
     * @notice Set the governance contract address
     * @dev Only owner can call this
     * @param _governanceContract Address of the GovernanceV2 contract
     */
    function setGovernanceContract(address _governanceContract) external onlyOwner {
        address oldAddress = governanceContract;
        governanceContract = _governanceContract;
        emit GovernanceContractUpdated(oldAddress, _governanceContract);
    }

    /**
     * @notice Create a campaign with milestone-based fund release
     * @param _goal Funding goal in MNT (wei)
     * @param _durationDays Campaign duration in days
     * @param _name Campaign name
     * @param _tokenName Equity token name
     * @param _tokenSymbol Equity token symbol
     * @param _founderShareBps Founder's token share in basis points
     * @param _milestoneTitles Array of milestone titles
     * @param _milestoneDescriptions Array of milestone descriptions
     * @param _milestonePercentages Array of percentages in basis points (must sum to 10000)
     * @param _milestoneDaysAfterEnd Array of days after campaign end for each deadline
     * @return campaignId The ID of the newly created campaign
     */
    function createCampaignWithMilestones(
        uint256 _goal,
        uint256 _durationDays,
        string calldata _name,
        string calldata _tokenName,
        string calldata _tokenSymbol,
        uint256 _founderShareBps,
        string[] calldata _milestoneTitles,
        string[] calldata _milestoneDescriptions,
        uint256[] calldata _milestonePercentages,
        uint256[] calldata _milestoneDaysAfterEnd
    ) external returns (uint256 campaignId) {
        // Validate basic inputs
        if (_goal < MIN_GOAL) revert InvalidGoal();
        if (_durationDays < MIN_DURATION_DAYS || _durationDays > MAX_DURATION_DAYS) {
            revert InvalidDuration();
        }
        if (_founderShareBps > MAX_FOUNDER_SHARE_BPS) revert InvalidFounderShare();

        // Validate milestone inputs
        uint256 milestoneCount = _milestoneTitles.length;
        if (milestoneCount == 0 || milestoneCount > MAX_MILESTONES) {
            revert InvalidMilestoneCount();
        }
        if (
            _milestoneDescriptions.length != milestoneCount ||
            _milestonePercentages.length != milestoneCount ||
            _milestoneDaysAfterEnd.length != milestoneCount
        ) {
            revert InvalidMilestoneCount();
        }

        // Validate percentages sum to 100%
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < milestoneCount; i++) {
            totalPercentage += _milestonePercentages[i];
        }
        if (totalPercentage != BPS_DENOMINATOR) revert PercentagesMustSumTo100();

        // Validate deadlines are ascending
        for (uint256 i = 1; i < milestoneCount; i++) {
            if (_milestoneDaysAfterEnd[i] <= _milestoneDaysAfterEnd[i - 1]) {
                revert DeadlinesNotAscending();
            }
        }

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
            founderTokensClaimed: false,
            milestoneCount: milestoneCount,
            releasedAmount: 0,
            hasMilestones: true
        });

        // Store milestones
        for (uint256 i = 0; i < milestoneCount; i++) {
            uint256 deadline = endAt + (_milestoneDaysAfterEnd[i] * 1 days);
            milestones[campaignId][i] = Milestone({
                title: _milestoneTitles[i],
                description: _milestoneDescriptions[i],
                percentage: _milestonePercentages[i],
                deadline: deadline,
                status: MilestoneStatus.Pending,
                proposalId: 0
            });

            emit MilestoneCreated(
                campaignId,
                i,
                _milestoneTitles[i],
                _milestonePercentages[i],
                deadline
            );
        }

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _goal,
            startAt,
            endAt,
            address(equityToken),
            _name,
            _tokenSymbol,
            true,
            milestoneCount
        );
    }

    /**
     * @notice Create a standard campaign without milestones (immediate release)
     * @dev Same as original CrowdfundingEscrow createCampaign
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

        // Store campaign data (no milestones)
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
            founderTokensClaimed: false,
            milestoneCount: 0,
            releasedAmount: 0,
            hasMilestones: false
        });

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _goal,
            startAt,
            endAt,
            address(equityToken),
            _name,
            _tokenSymbol,
            false,
            0
        );
    }

    /**
     * @notice Pledge MNT to a campaign
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
     * @notice Submit a milestone for governance approval
     * @dev Only creator can call. Requires governance contract to be set.
     * @param _campaignId ID of the campaign
     * @param _milestoneIndex Index of the milestone to submit
     * @return proposalId The governance proposal ID created
     */
    function submitMilestoneForApproval(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external nonReentrant returns (uint256 proposalId) {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (!campaign.hasMilestones) revert NotMilestoneCampaign();
        if (msg.sender != campaign.creator) revert NotCampaignCreator();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged < campaign.goal) revert GoalNotReached();
        if (_milestoneIndex >= campaign.milestoneCount) revert MilestoneNotFound();
        if (governanceContract == address(0)) revert GovernanceContractNotSet();

        Milestone storage milestone = milestones[_campaignId][_milestoneIndex];

        // Check milestone status
        if (milestone.status != MilestoneStatus.Pending && milestone.status != MilestoneStatus.Rejected) {
            revert MilestoneAlreadySubmitted();
        }

        // Check previous milestone is completed (if not first)
        if (_milestoneIndex > 0) {
            Milestone storage prevMilestone = milestones[_campaignId][_milestoneIndex - 1];
            if (prevMilestone.status != MilestoneStatus.Released) {
                revert PreviousMilestoneNotCompleted();
            }
        }

        // Check deadline hasn't passed
        if (block.timestamp > milestone.deadline) revert MilestoneDeadlinePassed();

        // Create governance proposal via callback
        // The governance contract will call back to update status
        proposalId = IGovernanceV2(governanceContract).createMilestoneProposal(
            _campaignId,
            _milestoneIndex,
            milestone.title,
            milestone.description
        );

        // Update milestone
        milestone.status = MilestoneStatus.Voting;
        milestone.proposalId = proposalId;

        emit MilestoneSubmitted(_campaignId, _milestoneIndex, proposalId);
        emit MilestoneStatusChanged(_campaignId, _milestoneIndex, MilestoneStatus.Voting);
    }

    /**
     * @notice Update milestone status after governance vote
     * @dev Only governance contract can call this
     * @param _campaignId Campaign ID
     * @param _milestoneIndex Milestone index
     * @param _approved Whether the milestone was approved
     */
    function updateMilestoneStatus(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        bool _approved
    ) external onlyGovernance {
        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (_milestoneIndex >= campaign.milestoneCount) revert MilestoneNotFound();

        Milestone storage milestone = milestones[_campaignId][_milestoneIndex];

        MilestoneStatus newStatus = _approved ? MilestoneStatus.Approved : MilestoneStatus.Rejected;
        milestone.status = newStatus;

        emit MilestoneStatusChanged(_campaignId, _milestoneIndex, newStatus);
    }

    /**
     * @notice Release funds for an approved milestone
     * @param _campaignId Campaign ID
     * @param _milestoneIndex Milestone index
     */
    function releaseMilestoneFunds(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (!campaign.hasMilestones) revert NotMilestoneCampaign();
        if (msg.sender != campaign.creator) revert NotCampaignCreator();
        if (_milestoneIndex >= campaign.milestoneCount) revert MilestoneNotFound();

        Milestone storage milestone = milestones[_campaignId][_milestoneIndex];

        if (milestone.status != MilestoneStatus.Approved) revert MilestoneNotApproved();

        // Calculate release amount
        uint256 grossAmount = (campaign.pledged * milestone.percentage) / BPS_DENOMINATOR;
        uint256 platformFee = (grossAmount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = grossAmount - platformFee;

        // Update state before transfers
        milestone.status = MilestoneStatus.Released;
        campaign.releasedAmount += grossAmount;

        // Transfer platform fee
        (bool feeSuccess, ) = platformWallet.call{value: platformFee}("");
        if (!feeSuccess) revert TransferFailed();

        // Transfer net amount to creator
        (bool success, ) = campaign.creator.call{value: netAmount}("");
        if (!success) revert TransferFailed();

        emit MilestoneFundsReleased(_campaignId, _milestoneIndex, grossAmount, platformFee, netAmount);
        emit MilestoneStatusChanged(_campaignId, _milestoneIndex, MilestoneStatus.Released);
    }

    /**
     * @notice Claim funds for non-milestone campaign (immediate release)
     * @param _campaignId ID of the campaign
     */
    function claim(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (campaign.hasMilestones) revert IsMilestoneCampaign();
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

        campaign.releasedAmount = grossAmount;

        // Transfer platform fee
        (bool feeSuccess, ) = platformWallet.call{value: platformFee}("");
        if (!feeSuccess) revert TransferFailed();

        // Transfer net amount to creator
        (bool success, ) = campaign.creator.call{value: netAmount}("");
        if (!success) revert TransferFailed();

        emit MilestoneFundsReleased(_campaignId, 0, grossAmount, platformFee, netAmount);
    }

    /**
     * @notice Refund pledge after failed campaign
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

    /**
     * @notice Emergency refund for milestone campaigns when a milestone is rejected
     * @dev Only available if any milestone is rejected and there are unreleased funds
     * @param _campaignId ID of the campaign
     */
    function emergencyRefund(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (!campaign.hasMilestones) revert NotMilestoneCampaign();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged < campaign.goal) revert GoalNotReached();

        // Check if any milestone is rejected
        bool hasRejectedMilestone = false;
        for (uint256 i = 0; i < campaign.milestoneCount; i++) {
            if (milestones[_campaignId][i].status == MilestoneStatus.Rejected) {
                hasRejectedMilestone = true;
                break;
            }
        }
        if (!hasRejectedMilestone) revert NoMilestonesRejected();

        uint256 pledged = pledges[_campaignId][msg.sender];
        if (pledged == 0) revert NoPledge();

        // Calculate refund based on unreleased funds proportion
        uint256 unreleasedAmount = campaign.pledged - campaign.releasedAmount;
        uint256 refundAmount = (pledged * unreleasedAmount) / campaign.pledged;

        if (refundAmount == 0) revert ZeroAmount();

        // Clear pledge
        pledges[_campaignId][msg.sender] = 0;

        // Transfer refund
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        if (!success) revert TransferFailed();

        emit Refunded(_campaignId, msg.sender, refundAmount);
    }

    /**
     * @notice Claim equity tokens after successful campaign
     * @param _campaignId ID of the campaign
     */
    function claimTokens(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged < campaign.goal) revert GoalNotReached();

        // For non-milestone campaigns, require claimed
        // For milestone campaigns, just need goal reached
        if (!campaign.hasMilestones && !campaign.claimed) {
            revert NotCampaignCreator(); // Creator must claim first
        }

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
     * @param _campaignId ID of the campaign
     */
    function claimFounderTokens(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];

        // Validations
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.creator) revert NotCampaignCreator();
        if (block.timestamp < campaign.endAt) revert CampaignNotEnded();
        if (campaign.pledged < campaign.goal) revert GoalNotReached();
        if (campaign.founderTokensClaimed) revert FounderTokensAlreadyClaimed();
        if (campaign.founderShareBps == 0) revert ZeroAmount();

        // For non-milestone campaigns, require claimed
        if (!campaign.hasMilestones && !campaign.claimed) {
            revert NotCampaignCreator();
        }

        // Mark founder tokens as claimed
        campaign.founderTokensClaimed = true;

        // Calculate founder token amount
        uint256 founderTokens = (campaign.pledged * campaign.founderShareBps) /
                                (BPS_DENOMINATOR - campaign.founderShareBps);

        // Mint founder tokens
        EquityToken(campaign.equityToken).mint(campaign.creator, founderTokens);

        emit FounderTokensClaimed(_campaignId, campaign.creator, founderTokens);
    }

    // ============ View Functions ============

    /**
     * @notice Get campaign details
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    /**
     * @notice Get milestone details
     */
    function getMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external view returns (Milestone memory) {
        return milestones[_campaignId][_milestoneIndex];
    }

    /**
     * @notice Get all milestones for a campaign
     */
    function getCampaignMilestones(
        uint256 _campaignId
    ) external view returns (Milestone[] memory) {
        Campaign storage campaign = campaigns[_campaignId];
        Milestone[] memory result = new Milestone[](campaign.milestoneCount);

        for (uint256 i = 0; i < campaign.milestoneCount; i++) {
            result[i] = milestones[_campaignId][i];
        }

        return result;
    }

    /**
     * @notice Get unreleased funds for a milestone campaign
     */
    function getUnreleasedFunds(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.pledged < campaign.goal) return 0;
        return campaign.pledged - campaign.releasedAmount;
    }

    /**
     * @notice Get pledge amount for an investor
     */
    function getPledge(uint256 _campaignId, address _investor) external view returns (uint256) {
        return pledges[_campaignId][_investor];
    }

    /**
     * @notice Check if campaign funding was successful
     */
    function isCampaignSuccessful(uint256 _campaignId) external view returns (bool) {
        Campaign storage campaign = campaigns[_campaignId];
        return block.timestamp >= campaign.endAt && campaign.pledged >= campaign.goal;
    }

    /**
     * @notice Check if campaign has ended
     */
    function isCampaignEnded(uint256 _campaignId) external view returns (bool) {
        return block.timestamp >= campaigns[_campaignId].endAt;
    }

    /**
     * @notice Get time remaining until campaign ends
     */
    function getTimeRemaining(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        if (block.timestamp >= campaign.endAt) return 0;
        return campaign.endAt - block.timestamp;
    }

    /**
     * @notice Calculate funding progress percentage
     */
    function getFundingProgress(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.goal == 0) return 0;
        return (campaign.pledged * 100) / campaign.goal;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform wallet address
     */
    function updatePlatformWallet(address _newWallet) external onlyOwner {
        if (_newWallet == address(0)) revert InvalidPlatformWallet();
        address oldWallet = platformWallet;
        platformWallet = _newWallet;
        emit PlatformWalletUpdated(oldWallet, _newWallet);
    }

    // ============ Receive Function ============

    /// @notice Reject direct MNT transfers
    receive() external payable {
        revert("Use pledge() function");
    }
}

// ============ Interface for GovernanceV2 ============

interface IGovernanceV2 {
    function createMilestoneProposal(
        uint256 campaignId,
        uint256 milestoneIndex,
        string calldata title,
        string calldata description
    ) external returns (uint256 proposalId);
}
