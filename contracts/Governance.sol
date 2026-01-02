// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./EquityToken.sol";
import "./CrowdfundingEscrow.sol";

/**
 * @title Governance
 * @notice On-chain governance for crowdfunded projects
 * @dev Token holders can create proposals and vote based on their token balance
 *      Voting power is determined by EquityToken holdings at proposal creation
 *
 * Network: Mantle Sepolia Testnet (Chain ID: 5003)
 */
contract Governance is ReentrancyGuard {
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

    /// @notice Reference to the CrowdfundingEscrow contract
    CrowdfundingEscrow public immutable escrow;

    /// @notice Proposal ID => Proposal data
    mapping(uint256 => Proposal) public proposals;

    /// @notice Proposal ID => Voter => Has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Proposal ID => Voter => Vote weight used
    mapping(uint256 => mapping(address => uint256)) public voteWeight;

    /// @notice Campaign ID => Proposal IDs
    mapping(uint256 => uint256[]) public campaignProposals;

    // ============ Events ============

    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed campaignId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
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

    // ============ Constructor ============

    /**
     * @notice Initialize the governance contract
     * @param _escrow Address of the CrowdfundingEscrow contract
     */
    constructor(address _escrow) {
        escrow = CrowdfundingEscrow(payable(_escrow));
    }

    // ============ External Functions ============

    /**
     * @notice Create a new proposal for a campaign
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
        CrowdfundingEscrow.Campaign memory campaign = escrow.getCampaign(_campaignId);

        // Validate campaign
        if (campaign.creator == address(0)) revert InvalidCampaign();
        if (!escrow.isCampaignSuccessful(_campaignId)) revert CampaignNotSuccessful();

        // Get equity token
        EquityToken token = EquityToken(campaign.equityToken);
        uint256 totalSupply = token.totalSupply();
        uint256 proposerBalance = token.balanceOf(msg.sender);

        // Check proposer has minimum required tokens (1% of total supply)
        uint256 minRequired = (totalSupply * MIN_PROPOSER_HOLDING_BPS) / BPS_DENOMINATOR;
        if (proposerBalance < minRequired) revert InsufficientTokens();

        // Create proposal
        proposalId = proposalCount;
        proposalCount++;

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + VOTING_PERIOD;

        proposals[proposalId] = Proposal({
            campaignId: _campaignId,
            proposer: msg.sender,
            title: _title,
            description: _description,
            forVotes: 0,
            againstVotes: 0,
            startTime: startTime,
            endTime: endTime,
            executed: false,
            canceled: false
        });

        // Track proposal for campaign
        campaignProposals[_campaignId].push(proposalId);

        emit ProposalCreated(
            proposalId,
            _campaignId,
            msg.sender,
            _title,
            startTime,
            endTime
        );
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
        CrowdfundingEscrow.Campaign memory campaign = escrow.getCampaign(proposal.campaignId);
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
     * @dev Anyone can call this to finalize the proposal result
     * @param _proposalId ID of the proposal
     */
    function executeProposal(uint256 _proposalId) external {
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

        emit ProposalCanceled(_proposalId);
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
}
