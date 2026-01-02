import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MilestoneEscrow, GovernanceV2, EquityToken } from "../typechain-types";

describe("GovernanceV2", function () {
  let milestoneEscrow: MilestoneEscrow;
  let governance: GovernanceV2;
  let equityToken: EquityToken;
  let platformWallet: HardhatEthersSigner;
  let creator: HardhatEthersSigner;
  let investor1: HardhatEthersSigner;
  let investor2: HardhatEthersSigner;
  let investor3: HardhatEthersSigner;

  const ONE_DAY = 86400;
  const VOTING_PERIOD = 3 * ONE_DAY;

  beforeEach(async function () {
    [platformWallet, creator, investor1, investor2, investor3] = await ethers.getSigners();

    // Deploy MilestoneEscrow
    const MilestoneEscrowFactory = await ethers.getContractFactory("MilestoneEscrow");
    milestoneEscrow = await MilestoneEscrowFactory.deploy(platformWallet.address);
    await milestoneEscrow.waitForDeployment();

    // Deploy GovernanceV2
    const GovernanceV2Factory = await ethers.getContractFactory("GovernanceV2");
    governance = await GovernanceV2Factory.deploy(await milestoneEscrow.getAddress());
    await governance.waitForDeployment();

    // Set governance contract
    await milestoneEscrow.setGovernanceContract(await governance.getAddress());

    // Create a campaign with milestones
    const goal = ethers.parseEther("100");
    const durationDays = 7;
    const founderShareBps = 0n;

    const milestoneTitles = ["M1", "M2"];
    const milestoneDescriptions = ["First milestone", "Second milestone"];
    const milestonePercentages = [5000n, 5000n];
    const milestoneDaysAfterEnd = [30n, 60n];

    await milestoneEscrow.connect(creator).createCampaignWithMilestones(
      goal,
      durationDays,
      "Test Campaign",
      "Test Token",
      "TEST",
      founderShareBps,
      milestoneTitles,
      milestoneDescriptions,
      milestonePercentages,
      milestoneDaysAfterEnd
    );

    // Fund the campaign
    await milestoneEscrow.connect(investor1).pledge(0, { value: ethers.parseEther("50") });
    await milestoneEscrow.connect(investor2).pledge(0, { value: ethers.parseEther("30") });
    await milestoneEscrow.connect(investor3).pledge(0, { value: ethers.parseEther("20") });

    // Move past deadline
    await time.increase(8 * ONE_DAY);

    // Claim tokens
    await milestoneEscrow.connect(investor1).claimTokens(0);
    await milestoneEscrow.connect(investor2).claimTokens(0);
    await milestoneEscrow.connect(investor3).claimTokens(0);

    // Get equity token address
    const campaign = await milestoneEscrow.getCampaign(0);
    equityToken = await ethers.getContractAt("EquityToken", campaign.equityToken);
  });

  describe("General Proposals", function () {
    it("Should create general proposal with sufficient tokens", async function () {
      // investor1 has 50% of tokens (more than 1% required)
      await expect(
        governance.connect(investor1).createProposal(
          0,
          "Test Proposal",
          "This is a test proposal"
        )
      ).to.emit(governance, "ProposalCreated");

      const proposal = await governance.getProposal(0);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.proposalType).to.equal(0); // General
    });

    it("Should reject proposal creation without sufficient tokens", async function () {
      // Transfer tokens away to make investor3 have less than 1%
      const investor3Balance = await equityToken.balanceOf(investor3.address);
      await equityToken.connect(investor3).transfer(investor1.address, investor3Balance);

      await expect(
        governance.connect(investor3).createProposal(
          0,
          "Test Proposal",
          "This is a test proposal"
        )
      ).to.be.revertedWithCustomError(governance, "InsufficientTokens");
    });

    it("Should allow voting on general proposals", async function () {
      await governance.connect(investor1).createProposal(
        0,
        "Test Proposal",
        "This is a test proposal"
      );

      await expect(
        governance.connect(investor1).vote(0, true)
      ).to.emit(governance, "Voted");

      await expect(
        governance.connect(investor2).vote(0, false)
      ).to.emit(governance, "Voted");

      const proposal = await governance.getProposal(0);
      expect(proposal.forVotes).to.equal(ethers.parseEther("50"));
      expect(proposal.againstVotes).to.equal(ethers.parseEther("30"));
    });

    it("Should not allow double voting", async function () {
      await governance.connect(investor1).createProposal(
        0,
        "Test Proposal",
        "This is a test proposal"
      );

      await governance.connect(investor1).vote(0, true);

      await expect(
        governance.connect(investor1).vote(0, true)
      ).to.be.revertedWithCustomError(governance, "AlreadyVoted");
    });

    it("Should execute general proposal after voting ends", async function () {
      await governance.connect(investor1).createProposal(
        0,
        "Test Proposal",
        "This is a test proposal"
      );

      // Vote majority in favor
      await governance.connect(investor1).vote(0, true);
      await governance.connect(investor2).vote(0, true);

      // Move past voting period
      await time.increase(VOTING_PERIOD + 1);

      await expect(governance.executeProposal(0))
        .to.emit(governance, "ProposalExecuted")
        .withArgs(0, true);
    });
  });

  describe("Milestone Proposals", function () {
    it("Should create milestone proposal through escrow", async function () {
      await expect(
        milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0)
      ).to.emit(governance, "ProposalCreated");

      const proposal = await governance.getProposal(0);
      expect(proposal.proposalType).to.equal(1); // Milestone
      expect(proposal.milestoneIndex).to.equal(0);
    });

    it("Should not allow direct milestone proposal creation", async function () {
      await expect(
        governance.connect(creator).createMilestoneProposal(
          0,
          0,
          "Milestone Title",
          "Milestone Description"
        )
      ).to.be.revertedWith("Only escrow can create milestone proposals");
    });

    it("Should update milestone status on approval", async function () {
      // Submit milestone
      await milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0);

      // Vote in favor
      await governance.connect(investor1).vote(0, true);
      await governance.connect(investor2).vote(0, true);

      // Move past voting period
      await time.increase(VOTING_PERIOD + 1);

      // Execute
      await expect(governance.executeProposal(0))
        .to.emit(governance, "MilestoneProposalExecuted")
        .withArgs(0, 0, 0, true);

      // Check milestone status
      const milestone = await milestoneEscrow.getMilestone(0, 0);
      expect(milestone.status).to.equal(2); // Approved
    });

    it("Should update milestone status on rejection", async function () {
      // Submit milestone
      await milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0);

      // Vote against
      await governance.connect(investor1).vote(0, false);
      await governance.connect(investor2).vote(0, false);

      // Move past voting period
      await time.increase(VOTING_PERIOD + 1);

      // Execute
      await expect(governance.executeProposal(0))
        .to.emit(governance, "MilestoneProposalExecuted")
        .withArgs(0, 0, 0, false);

      // Check milestone status
      const milestone = await milestoneEscrow.getMilestone(0, 0);
      expect(milestone.status).to.equal(3); // Rejected
    });

    it("Should track milestone proposal IDs", async function () {
      // Submit milestone
      await milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0);

      const proposalId = await governance.getMilestoneProposalId(0, 0);
      expect(proposalId).to.equal(0);
    });
  });

  describe("Proposal Status", function () {
    beforeEach(async function () {
      await governance.connect(investor1).createProposal(
        0,
        "Test Proposal",
        "This is a test proposal"
      );
    });

    it("Should return correct status for active proposal", async function () {
      const status = await governance.getProposalStatus(0);
      expect(status).to.equal(1); // Active
    });

    it("Should return correct status for ended proposal", async function () {
      await time.increase(VOTING_PERIOD + 1);
      const status = await governance.getProposalStatus(0);
      expect(status).to.equal(2); // Ended
    });

    it("Should return correct status for executed proposal", async function () {
      await governance.connect(investor1).vote(0, true);
      await time.increase(VOTING_PERIOD + 1);
      await governance.executeProposal(0);

      const status = await governance.getProposalStatus(0);
      expect(status).to.equal(3); // Executed
    });

    it("Should return correct status for canceled proposal", async function () {
      await governance.connect(investor1).cancelProposal(0);

      const status = await governance.getProposalStatus(0);
      expect(status).to.equal(4); // Canceled
    });
  });

  describe("Voting Results", function () {
    it("Should calculate voting percentages correctly", async function () {
      await governance.connect(investor1).createProposal(
        0,
        "Test Proposal",
        "This is a test proposal"
      );

      await governance.connect(investor1).vote(0, true); // 50 tokens
      await governance.connect(investor2).vote(0, false); // 30 tokens
      await governance.connect(investor3).vote(0, true); // 20 tokens

      const [forPercent, againstPercent, totalVotes] = await governance.getVotingResults(0);

      // For: 70 tokens (70%), Against: 30 tokens (30%)
      expect(forPercent).to.equal(70);
      expect(againstPercent).to.equal(30);
      expect(totalVotes).to.equal(ethers.parseEther("100"));
    });

    it("Should return zero percentages when no votes", async function () {
      await governance.connect(investor1).createProposal(
        0,
        "Test Proposal",
        "This is a test proposal"
      );

      const [forPercent, againstPercent, totalVotes] = await governance.getVotingResults(0);

      expect(forPercent).to.equal(0);
      expect(againstPercent).to.equal(0);
      expect(totalVotes).to.equal(0);
    });
  });

  describe("View Functions", function () {
    it("Should return campaign proposals", async function () {
      await governance.connect(investor1).createProposal(0, "Proposal 1", "Desc 1");
      await governance.connect(investor1).createProposal(0, "Proposal 2", "Desc 2");

      const proposals = await governance.getCampaignProposals(0);
      expect(proposals.length).to.equal(2);
    });

    it("Should distinguish between general and milestone proposals", async function () {
      // Create general proposal
      await governance.connect(investor1).createProposal(0, "General", "General proposal");

      // Submit milestone
      await milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0);

      // Check proposal types
      expect(await governance.isMilestoneProposal(0)).to.be.false;
      expect(await governance.isMilestoneProposal(1)).to.be.true;

      // Get milestone proposals
      const milestoneProposals = await governance.getMilestoneProposals(0);
      expect(milestoneProposals.length).to.equal(1);
      expect(milestoneProposals[0]).to.equal(1);

      // Get general proposals
      const generalProposals = await governance.getGeneralProposals(0);
      expect(generalProposals.length).to.equal(1);
      expect(generalProposals[0]).to.equal(0);
    });

    it("Should return time remaining", async function () {
      await governance.connect(investor1).createProposal(0, "Test", "Test");

      const timeRemaining = await governance.getTimeRemaining(0);
      expect(timeRemaining).to.be.closeTo(BigInt(VOTING_PERIOD), 5n);

      await time.increase(VOTING_PERIOD + 1);

      const timeRemainingAfter = await governance.getTimeRemaining(0);
      expect(timeRemainingAfter).to.equal(0);
    });

    it("Should check if proposal passed", async function () {
      await governance.connect(investor1).createProposal(0, "Test", "Test");

      // Before voting ends
      expect(await governance.proposalPassed(0)).to.be.false;

      // Vote in favor
      await governance.connect(investor1).vote(0, true);
      await governance.connect(investor2).vote(0, true);

      // Still before voting ends
      expect(await governance.proposalPassed(0)).to.be.false;

      // After voting ends
      await time.increase(VOTING_PERIOD + 1);
      expect(await governance.proposalPassed(0)).to.be.true;
    });

    it("Should return vote weight used", async function () {
      await governance.connect(investor1).createProposal(0, "Test", "Test");
      await governance.connect(investor1).vote(0, true);

      const weight = await governance.getVoteWeight(0, investor1.address);
      expect(weight).to.equal(ethers.parseEther("50"));
    });
  });

  describe("Proposal Cancellation", function () {
    it("Should allow proposer to cancel", async function () {
      await governance.connect(investor1).createProposal(0, "Test", "Test");

      await expect(governance.connect(investor1).cancelProposal(0))
        .to.emit(governance, "ProposalCanceled");
    });

    it("Should not allow non-proposer to cancel", async function () {
      await governance.connect(investor1).createProposal(0, "Test", "Test");

      await expect(
        governance.connect(investor2).cancelProposal(0)
      ).to.be.revertedWithCustomError(governance, "NotProposer");
    });

    it("Should not allow canceling executed proposal", async function () {
      await governance.connect(investor1).createProposal(0, "Test", "Test");
      await governance.connect(investor1).vote(0, true);
      await time.increase(VOTING_PERIOD + 1);
      await governance.executeProposal(0);

      await expect(
        governance.connect(investor1).cancelProposal(0)
      ).to.be.revertedWithCustomError(governance, "AlreadyExecuted");
    });
  });
});
