// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./EquityToken.sol";
import "./MilestoneEscrow.sol";

/**
 * @title GovernanceV2
 * @notice Extended governance for milestone-based crowdfunding campaigns
 * @dev Supports both regular proposals and milestone approval proposals
 *      Integrates with MilestoneEscrow for fund release approval
 *
 * Network: Mantle Sepolia Testnet (Chain ID: 5003)
 *
 * Key Features:
 * - Regular proposals for general governance decisions
 * - Milestone proposals for approving fund releases
 * - Token-weighted voting based on EquityToken holdings
 * - Automatic callback to MilestoneEscrow on milestone proposal execution
 */
contract GovernanceV2 is ReentrancyGuard {
    // ============ Enums ============

    /// @notice Type of proposal
    enum ProposalType {
        General,        // Regular governance proposal
        Milestone       // Milestone approval proposal
    }

    // ============ Structs ============

    struct Proposal {
        uint256 campaignId;         // Campaign this proposal belongs to
        address proposer;           // Address that created the proposal
        string title;               // Proposal title
        string description;         // Proposal description
        uint256 forVotes;           // Total votes in favor
        uint256 againstVotes;       // Total votes against
        uint256 startTime;          // When voting starts
        uint256 endTime;            // When voting ends
        bool executed;              // Whether proposal has been executed
        bool canceled;              // Whether proposal was canceled
        ProposalType proposalType;  // Type of proposal
        uint256 milestoneIndex;     // Milestone index (only for milestone proposals)
    }

    // ============ State Variables ============

    /// @notice Total number of proposals created
    uint256 public proposalCount;

    /// @notice Default voting period in seconds (3 days)
    uint256 public constant VOTING_PERIOD = 3 days;

    /// @notice Minimum token holding percentage to create proposal (1% = 100 BPS)
    uint256 public constant MIN_PROPOSER_HOLDING_BPS = 100;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Reference to the MilestoneEscrow contract
    MilestoneEscrow public immutable escrow;

    /// @notice Proposal ID => Proposal data
    mapping(uint256 => Proposal) public proposals;

    /// @notice Proposal ID => Voter => Has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Proposal ID => Voter => Vote weight used
    mapping(uint256 => mapping(address => uint256)) public voteWeight;

    /// @notice Campaign ID => Proposal IDs
    mapping(uint256 => uint256[]) public campaignProposals;

    /// @notice Campaign ID => Milestone Index => Proposal ID
    mapping(uint256 => mapping(uint256 => uint256)) public milestoneProposalId;

    // ============ Events ============

    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed campaignId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime,
        ProposalType proposalType,
        uint256 milestoneIndex
    );

    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        bool passed
    );

    event ProposalCanceled(
        uint256 indexed proposalId
    );

    event MilestoneProposalExecuted(
        uint256 indexed proposalId,
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        bool approved
    );

    // ============ Errors ============

    error InvalidCampaign();
    error CampaignNotSuccessful();
    error InsufficientTokens();
    error ProposalNotFound();
    error VotingNotActive();
    error VotingEnded();
    error VotingNotEnded();
    error AlreadyVoted();
    error AlreadyExecuted();
    error ProposalAlreadyCanceled();
    error NotProposer();
    error NoVotingPower();
    error InvalidMilestoneIndex();
    error MilestoneAlreadyHasProposal();
    error NotMilestoneProposal();
    error OnlyCreatorCanSubmitMilestone();
    error MilestoneNotInVotingStatus();

    // ============ Constructor ============

    /**
     * @notice Initialize the governance contract
     * @param _escrow Address of the MilestoneEscrow contract
     */
    constructor(address _escrow) {
        escrow = MilestoneEscrow(payable(_escrow));
    }

    // ============ External Functions ============

    /**
     * @notice Create a new general proposal for a campaign
     * @dev Only token holders with >= 1% of supply can create proposals
     *      Campaign must be successfully funded
     * @param _campaignId ID of the campaign
     * @param _title Proposal title
     * @param _description Proposal description
     * @return proposalId The ID of the newly created proposal
     */
    function createProposal(
        uint256 _campaignId,
        string calldata _title,
        string calldata _description
    ) external returns (uint256 proposalId) {
        // Get campaign data
        MilestoneEscrow.Campaign memory campaign = escrow.getCampaign(_campaignId);

        // Validate campaign
        if (campaign.creator == address(0)) revert InvalidCampaign();
        if (!escrow.isCampaignSuccessful(_campaignId)) revert CampaignNotSuccessful();

        // Check proposer has minimum required tokens
        _validateProposerTokens(campaign.equityToken);

        // Create proposal
        proposalId = _createProposal(
            _campaignId,
            _title,
            _description,
            ProposalType.General,
            0
        );
    }

    /**
     * @notice Create a milestone approval proposal
     * @dev Called by MilestoneEscrow.submitMilestoneForApproval()
     *      Only the campaign creator can submit milestones via MilestoneEscrow
     * @param _campaignId ID of the campaign
     * @param _milestoneIndex Index of the milestone
     * @param _title Milestone title for the proposal
     * @param _description Milestone description for the proposal
     * @return proposalId The ID of the newly created proposal
     */
    function createMilestoneProposal(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        string calldata _title,
        string calldata _description
    ) external returns (uint256 proposalId) {
        // Only MilestoneEscrow can create milestone proposals
        require(msg.sender == address(escrow), "Only escrow can create milestone proposals");

        // Validate milestone doesn't already have an active proposal
        uint256 existingProposalId = milestoneProposalId[_campaignId][_milestoneIndex];
        if (existingProposalId != 0) {
            Proposal storage existing = proposals[existingProposalId];
            // Allow new proposal only if previous was canceled or executed and rejected
            if (!existing.canceled && !existing.executed) {
                revert MilestoneAlreadyHasProposal();
            }
            if (existing.executed && existing.forVotes > existing.againstVotes) {
                revert MilestoneAlreadyHasProposal();
            }
        }

        // Create proposal
        proposalId = _createProposal(
            _campaignId,
            _title,
            _description,
            ProposalType.Milestone,
            _milestoneIndex
        );

        // Track milestone proposal
        milestoneProposalId[_campaignId][_milestoneIndex] = proposalId;
    }

    /**
     * @notice Vote on a proposal
     * @dev Voting weight is based on current token balance
     * @param _proposalId ID of the proposal
     * @param _support True for yes, false for no
     */
    function vote(uint256 _proposalId, bool _support) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        // Validations
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (proposal.canceled) revert ProposalAlreadyCanceled();
        if (block.timestamp < proposal.startTime) revert VotingNotActive();
        if (block.timestamp >= proposal.endTime) revert VotingEnded();
        if (hasVoted[_proposalId][msg.sender]) revert AlreadyVoted();

        // Get voter's token balance
        MilestoneEscrow.Campaign memory campaign = escrow.getCampaign(proposal.campaignId);
        EquityToken token = EquityToken(campaign.equityToken);
        uint256 weight = token.balanceOf(msg.sender);

        if (weight == 0) revert NoVotingPower();

        // Record vote
        hasVoted[_proposalId][msg.sender] = true;
        voteWeight[_proposalId][msg.sender] = weight;

        if (_support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit Voted(_proposalId, msg.sender, _support, weight);
    }

    /**
     * @notice Execute a proposal after voting ends
     * @dev For milestone proposals, calls back to MilestoneEscrow
     * @param _proposalId ID of the proposal
     */
    function executeProposal(uint256 _proposalId) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        // Validations
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (proposal.canceled) revert ProposalAlreadyCanceled();
        if (block.timestamp < proposal.endTime) revert VotingNotEnded();
        if (proposal.executed) revert AlreadyExecuted();

        // Mark as executed
        proposal.executed = true;

        // Determine if passed (more for votes than against)
        bool passed = proposal.forVotes > proposal.againstVotes;

        // If milestone proposal, update MilestoneEscrow
        if (proposal.proposalType == ProposalType.Milestone) {
            escrow.updateMilestoneStatus(
                proposal.campaignId,
                proposal.milestoneIndex,
                passed
            );

            emit MilestoneProposalExecuted(
                _proposalId,
                proposal.campaignId,
                proposal.milestoneIndex,
                passed
            );
        }

        emit ProposalExecuted(_proposalId, passed);
    }

    /**
     * @notice Cancel a proposal
     * @dev Only the proposer can cancel, and only before voting ends
     * @param _proposalId ID of the proposal
     */
    function cancelProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];

        // Validations
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (msg.sender != proposal.proposer) revert NotProposer();
        if (proposal.executed) revert AlreadyExecuted();
        if (proposal.canceled) revert ProposalAlreadyCanceled();

        proposal.canceled = true;

        // If milestone proposal, revert milestone status to Pending
        if (proposal.proposalType == ProposalType.Milestone) {
            // Note: MilestoneEscrow handles status reversion internally
            // The milestone can be resubmitted after cancellation
        }

        emit ProposalCanceled(_proposalId);
    }

    // ============ Internal Functions ============

    /**
     * @notice Validate proposer has minimum required tokens
     * @param _equityToken Address of the equity token
     */
    function _validateProposerTokens(address _equityToken) internal view {
        EquityToken token = EquityToken(_equityToken);
        uint256 totalSupply = token.totalSupply();
        uint256 proposerBalance = token.balanceOf(msg.sender);

        // Check proposer has minimum required tokens (1% of total supply)
        uint256 minRequired = (totalSupply * MIN_PROPOSER_HOLDING_BPS) / BPS_DENOMINATOR;
        if (proposerBalance < minRequired) revert InsufficientTokens();
    }

    /**
     * @notice Internal function to create a proposal
     * @param _campaignId ID of the campaign
     * @param _title Proposal title
     * @param _description Proposal description
     * @param _proposalType Type of proposal
     * @param _milestoneIndex Milestone index (0 for general proposals)
     * @return proposalId The ID of the newly created proposal
     */
    function _createProposal(
        uint256 _campaignId,
        string calldata _title,
        string calldata _description,
        ProposalType _proposalType,
        uint256 _milestoneIndex
    ) internal returns (uint256 proposalId) {
        proposalId = proposalCount;
        proposalCount++;

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + VOTING_PERIOD;

        // For milestone proposals, the proposer is stored as the escrow contract
        // but we track the original creator in the event
        address proposer = msg.sender;

        proposals[proposalId] = Proposal({
            campaignId: _campaignId,
            proposer: proposer,
            title: _title,
            description: _description,
            forVotes: 0,
            againstVotes: 0,
            startTime: startTime,
            endTime: endTime,
            executed: false,
            canceled: false,
            proposalType: _proposalType,
            milestoneIndex: _milestoneIndex
        });

        // Track proposal for campaign
        campaignProposals[_campaignId].push(proposalId);

        emit ProposalCreated(
            proposalId,
            _campaignId,
            proposer,
            _title,
            startTime,
            endTime,
            _proposalType,
            _milestoneIndex
        );
    }

    // ============ View Functions ============

    /**
     * @notice Get proposal details
     * @param _proposalId ID of the proposal
     * @return Proposal struct data
     */
    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        return proposals[_proposalId];
    }

    /**
     * @notice Get all proposals for a campaign
     * @param _campaignId ID of the campaign
     * @return Array of proposal IDs
     */
    function getCampaignProposals(uint256 _campaignId) external view returns (uint256[] memory) {
        return campaignProposals[_campaignId];
    }

    /**
     * @notice Get the proposal ID for a specific milestone
     * @param _campaignId ID of the campaign
     * @param _milestoneIndex Index of the milestone
     * @return proposalId The proposal ID (0 if no proposal exists)
     */
    function getMilestoneProposalId(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external view returns (uint256) {
        return milestoneProposalId[_campaignId][_milestoneIndex];
    }

    /**
     * @notice Check if a proposal passed
     * @dev Can only be called after voting ends
     * @param _proposalId ID of the proposal
     * @return True if proposal passed
     */
    function proposalPassed(uint256 _proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        if (block.timestamp < proposal.endTime) return false;
        if (proposal.canceled) return false;
        return proposal.forVotes > proposal.againstVotes;
    }

    /**
     * @notice Get voting status of a proposal
     * @param _proposalId ID of the proposal
     * @return status 0=pending, 1=active, 2=ended, 3=executed, 4=canceled
     */
    function getProposalStatus(uint256 _proposalId) external view returns (uint8 status) {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.canceled) return 4;
        if (proposal.executed) return 3;
        if (block.timestamp < proposal.startTime) return 0;
        if (block.timestamp < proposal.endTime) return 1;
        return 2;
    }

    /**
     * @notice Calculate current voting results as percentages
     * @param _proposalId ID of the proposal
     * @return forPercent Percentage of votes in favor (0-100)
     * @return againstPercent Percentage of votes against (0-100)
     * @return totalVotes Total votes cast
     */
    function getVotingResults(uint256 _proposalId) external view returns (
        uint256 forPercent,
        uint256 againstPercent,
        uint256 totalVotes
    ) {
        Proposal storage proposal = proposals[_proposalId];
        totalVotes = proposal.forVotes + proposal.againstVotes;

        if (totalVotes == 0) {
            return (0, 0, 0);
        }

        forPercent = (proposal.forVotes * 100) / totalVotes;
        againstPercent = (proposal.againstVotes * 100) / totalVotes;
    }

    /**
     * @notice Check if an address has voted on a proposal
     * @param _proposalId ID of the proposal
     * @param _voter Address to check
     * @return True if voter has voted
     */
    function hasAddressVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        return hasVoted[_proposalId][_voter];
    }

    /**
     * @notice Get the vote weight an address used
     * @param _proposalId ID of the proposal
     * @param _voter Address to check
     * @return Vote weight (token amount at time of voting)
     */
    function getVoteWeight(uint256 _proposalId, address _voter) external view returns (uint256) {
        return voteWeight[_proposalId][_voter];
    }

    /**
     * @notice Get time remaining until voting ends
     * @param _proposalId ID of the proposal
     * @return Seconds remaining (0 if ended)
     */
    function getTimeRemaining(uint256 _proposalId) external view returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        if (block.timestamp >= proposal.endTime) return 0;
        return proposal.endTime - block.timestamp;
    }

    /**
     * @notice Check if a proposal is a milestone proposal
     * @param _proposalId ID of the proposal
     * @return True if milestone proposal
     */
    function isMilestoneProposal(uint256 _proposalId) external view returns (bool) {
        return proposals[_proposalId].proposalType == ProposalType.Milestone;
    }

    /**
     * @notice Get milestone proposals for a campaign
     * @param _campaignId ID of the campaign
     * @return proposalIds Array of milestone proposal IDs
     */
    function getMilestoneProposals(uint256 _campaignId) external view returns (uint256[] memory) {
        uint256[] memory allProposals = campaignProposals[_campaignId];

        // Count milestone proposals
        uint256 milestoneCount = 0;
        for (uint256 i = 0; i < allProposals.length; i++) {
            if (proposals[allProposals[i]].proposalType == ProposalType.Milestone) {
                milestoneCount++;
            }
        }

        // Collect milestone proposals
        uint256[] memory result = new uint256[](milestoneCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allProposals.length; i++) {
            if (proposals[allProposals[i]].proposalType == ProposalType.Milestone) {
                result[index] = allProposals[i];
                index++;
            }
        }

        return result;
    }

    /**
     * @notice Get general (non-milestone) proposals for a campaign
     * @param _campaignId ID of the campaign
     * @return proposalIds Array of general proposal IDs
     */
    function getGeneralProposals(uint256 _campaignId) external view returns (uint256[] memory) {
        uint256[] memory allProposals = campaignProposals[_campaignId];

        // Count general proposals
        uint256 generalCount = 0;
        for (uint256 i = 0; i < allProposals.length; i++) {
            if (proposals[allProposals[i]].proposalType == ProposalType.General) {
                generalCount++;
            }
        }

        // Collect general proposals
        uint256[] memory result = new uint256[](generalCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allProposals.length; i++) {
            if (proposals[allProposals[i]].proposalType == ProposalType.General) {
                result[index] = allProposals[i];
                index++;
            }
        }

        return result;
    }
}
