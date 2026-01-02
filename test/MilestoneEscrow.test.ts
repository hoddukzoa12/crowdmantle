import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MilestoneEscrow, GovernanceV2 } from "../typechain-types";

describe("MilestoneEscrow", function () {
  let milestoneEscrow: MilestoneEscrow;
  let governance: GovernanceV2;
  let platformWallet: HardhatEthersSigner;
  let creator: HardhatEthersSigner;
  let investor1: HardhatEthersSigner;
  let investor2: HardhatEthersSigner;

  const ONE_DAY = 86400;

  beforeEach(async function () {
    [platformWallet, creator, investor1, investor2] = await ethers.getSigners();

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
  });

  describe("Deployment", function () {
    it("Should set platform wallet correctly", async function () {
      expect(await milestoneEscrow.platformWallet()).to.equal(platformWallet.address);
    });

    it("Should set governance contract correctly", async function () {
      expect(await milestoneEscrow.governanceContract()).to.equal(await governance.getAddress());
    });
  });

  describe("Campaign Creation", function () {
    it("Should create campaign without milestones", async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 1000n; // 10%

      await expect(
        milestoneEscrow.connect(creator).createCampaign(
          goal,
          durationDays,
          "Test Campaign",
          "Test Token",
          "TEST",
          founderShareBps
        )
      ).to.emit(milestoneEscrow, "CampaignCreated");

      const campaign = await milestoneEscrow.getCampaign(0);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.goal).to.equal(goal);
      expect(campaign.hasMilestones).to.be.false;
    });

    it("Should create campaign with milestones", async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 1000n;

      const milestoneTitles = ["MVP Launch", "Beta Release", "Final Release"];
      const milestoneDescriptions = [
        "Complete MVP with core features",
        "Public beta with full features",
        "Production ready release"
      ];
      const milestonePercentages = [3000n, 4000n, 3000n]; // 30%, 40%, 30%
      const milestoneDaysAfterEnd = [30n, 60n, 90n];

      await expect(
        milestoneEscrow.connect(creator).createCampaignWithMilestones(
          goal,
          durationDays,
          "Milestone Campaign",
          "Milestone Token",
          "MILE",
          founderShareBps,
          milestoneTitles,
          milestoneDescriptions,
          milestonePercentages,
          milestoneDaysAfterEnd
        )
      ).to.emit(milestoneEscrow, "CampaignCreated");

      const campaign = await milestoneEscrow.getCampaign(0);
      expect(campaign.hasMilestones).to.be.true;
      expect(campaign.milestoneCount).to.equal(3);

      // Check milestones
      const milestone1 = await milestoneEscrow.getMilestone(0, 0);
      expect(milestone1.title).to.equal("MVP Launch");
      expect(milestone1.percentage).to.equal(3000n);
    });

    it("Should reject milestones that don't sum to 100%", async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 1000n;

      const milestoneTitles = ["MVP", "Beta"];
      const milestoneDescriptions = ["MVP", "Beta"];
      const milestonePercentages = [3000n, 3000n]; // 60%, not 100%
      const milestoneDaysAfterEnd = [30n, 60n];

      await expect(
        milestoneEscrow.connect(creator).createCampaignWithMilestones(
          goal,
          durationDays,
          "Bad Campaign",
          "Bad Token",
          "BAD",
          founderShareBps,
          milestoneTitles,
          milestoneDescriptions,
          milestonePercentages,
          milestoneDaysAfterEnd
        )
      ).to.be.revertedWithCustomError(milestoneEscrow, "PercentagesMustSumTo100");
    });

    it("Should reject more than 3 milestones", async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 1000n;

      const milestoneTitles = ["M1", "M2", "M3", "M4"];
      const milestoneDescriptions = ["M1", "M2", "M3", "M4"];
      const milestonePercentages = [2500n, 2500n, 2500n, 2500n];
      const milestoneDaysAfterEnd = [30n, 60n, 90n, 120n];

      await expect(
        milestoneEscrow.connect(creator).createCampaignWithMilestones(
          goal,
          durationDays,
          "Too Many",
          "Many Token",
          "MANY",
          founderShareBps,
          milestoneTitles,
          milestoneDescriptions,
          milestonePercentages,
          milestoneDaysAfterEnd
        )
      ).to.be.revertedWithCustomError(milestoneEscrow, "InvalidMilestoneCount");
    });
  });

  describe("Pledging", function () {
    beforeEach(async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 1000n;

      const milestoneTitles = ["M1", "M2"];
      const milestoneDescriptions = ["M1", "M2"];
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
    });

    it("Should accept pledges", async function () {
      const pledgeAmount = ethers.parseEther("10");

      await expect(
        milestoneEscrow.connect(investor1).pledge(0, { value: pledgeAmount })
      ).to.emit(milestoneEscrow, "Pledged");

      expect(await milestoneEscrow.getPledge(0, investor1.address)).to.equal(pledgeAmount);
    });

    it("Should allow unpledge before deadline", async function () {
      const pledgeAmount = ethers.parseEther("10");
      await milestoneEscrow.connect(investor1).pledge(0, { value: pledgeAmount });

      await expect(
        milestoneEscrow.connect(investor1).unpledge(0, pledgeAmount)
      ).to.emit(milestoneEscrow, "Unpledged");

      expect(await milestoneEscrow.getPledge(0, investor1.address)).to.equal(0);
    });
  });

  describe("Milestone Flow", function () {
    beforeEach(async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 0n; // No founder share for simpler testing

      const milestoneTitles = ["M1", "M2"];
      const milestoneDescriptions = ["M1", "M2"];
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
      await milestoneEscrow.connect(investor1).pledge(0, { value: ethers.parseEther("60") });
      await milestoneEscrow.connect(investor2).pledge(0, { value: ethers.parseEther("40") });

      // Move past deadline
      await time.increase(8 * ONE_DAY);
    });

    it("Should allow creator to submit milestone for approval", async function () {
      await expect(
        milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0)
      ).to.emit(milestoneEscrow, "MilestoneSubmitted");

      const milestone = await milestoneEscrow.getMilestone(0, 0);
      expect(milestone.status).to.equal(1); // Voting status
    });

    it("Should not allow non-creator to submit milestone", async function () {
      await expect(
        milestoneEscrow.connect(investor1).submitMilestoneForApproval(0, 0)
      ).to.be.revertedWithCustomError(milestoneEscrow, "NotCampaignCreator");
    });

    it("Should enforce sequential milestone completion", async function () {
      // Try to submit second milestone before first
      await expect(
        milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 1)
      ).to.be.revertedWithCustomError(milestoneEscrow, "PreviousMilestoneNotCompleted");
    });

    it("Should release funds after milestone approval", async function () {
      // Submit milestone
      await milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0);

      // Claim tokens first (required to vote)
      await milestoneEscrow.connect(investor1).claimTokens(0);
      await milestoneEscrow.connect(investor2).claimTokens(0);

      // Get proposal ID
      const milestone = await milestoneEscrow.getMilestone(0, 0);
      const proposalId = milestone.proposalId;

      // Vote for approval
      await governance.connect(investor1).vote(proposalId, true);
      await governance.connect(investor2).vote(proposalId, true);

      // Move past voting period
      await time.increase(4 * ONE_DAY);

      // Execute proposal
      await governance.executeProposal(proposalId);

      // Check milestone status
      const updatedMilestone = await milestoneEscrow.getMilestone(0, 0);
      expect(updatedMilestone.status).to.equal(2); // Approved

      // Release funds
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);

      await milestoneEscrow.connect(creator).releaseMilestoneFunds(0, 0);

      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);

      // 50% of 100 ETH = 50 ETH, minus 2% platform fee = 49 ETH
      const expectedRelease = ethers.parseEther("49");

      // Check that creator received funds (approximately, accounting for gas)
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.closeTo(
        expectedRelease,
        ethers.parseEther("0.01") // Allow for gas costs
      );
    });
  });

  describe("Emergency Refund", function () {
    beforeEach(async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 0n;

      const milestoneTitles = ["M1", "M2"];
      const milestoneDescriptions = ["M1", "M2"];
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
      await milestoneEscrow.connect(investor1).pledge(0, { value: ethers.parseEther("60") });
      await milestoneEscrow.connect(investor2).pledge(0, { value: ethers.parseEther("40") });

      // Move past deadline
      await time.increase(8 * ONE_DAY);
    });

    it("Should allow emergency refund after milestone rejection", async function () {
      // Submit milestone
      await milestoneEscrow.connect(creator).submitMilestoneForApproval(0, 0);

      // Claim tokens to vote
      await milestoneEscrow.connect(investor1).claimTokens(0);
      await milestoneEscrow.connect(investor2).claimTokens(0);

      // Get proposal ID
      const milestone = await milestoneEscrow.getMilestone(0, 0);
      const proposalId = milestone.proposalId;

      // Vote against
      await governance.connect(investor1).vote(proposalId, false);
      await governance.connect(investor2).vote(proposalId, false);

      // Move past voting period
      await time.increase(4 * ONE_DAY);

      // Execute proposal (will reject)
      await governance.executeProposal(proposalId);

      // Check milestone status is Rejected
      const updatedMilestone = await milestoneEscrow.getMilestone(0, 0);
      expect(updatedMilestone.status).to.equal(3); // Rejected

      // Emergency refund
      const investor1BalanceBefore = await ethers.provider.getBalance(investor1.address);

      await milestoneEscrow.connect(investor1).emergencyRefund(0);

      const investor1BalanceAfter = await ethers.provider.getBalance(investor1.address);

      // Should receive 60 ETH back (minus gas)
      expect(investor1BalanceAfter - investor1BalanceBefore).to.be.closeTo(
        ethers.parseEther("60"),
        ethers.parseEther("0.01")
      );
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const goal = ethers.parseEther("100");
      const durationDays = 7;
      const founderShareBps = 1000n;

      const milestoneTitles = ["M1", "M2", "M3"];
      const milestoneDescriptions = ["M1", "M2", "M3"];
      const milestonePercentages = [3000n, 4000n, 3000n];
      const milestoneDaysAfterEnd = [30n, 60n, 90n];

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
    });

    it("Should return all milestones", async function () {
      const campaignMilestones = await milestoneEscrow.getCampaignMilestones(0);
      expect(campaignMilestones.length).to.equal(3);
      expect(campaignMilestones[0].title).to.equal("M1");
      expect(campaignMilestones[1].title).to.equal("M2");
      expect(campaignMilestones[2].title).to.equal("M3");
    });

    it("Should return unreleased funds", async function () {
      // Fund the campaign
      await milestoneEscrow.connect(investor1).pledge(0, { value: ethers.parseEther("100") });

      const unreleased = await milestoneEscrow.getUnreleasedFunds(0);
      expect(unreleased).to.equal(ethers.parseEther("100"));
    });

    it("Should check campaign success correctly", async function () {
      // Not yet funded
      expect(await milestoneEscrow.isCampaignSuccessful(0)).to.be.false;

      // Fund the campaign fully
      await milestoneEscrow.connect(investor1).pledge(0, { value: ethers.parseEther("100") });

      // Still before deadline
      expect(await milestoneEscrow.isCampaignSuccessful(0)).to.be.false;

      // Move past deadline
      await time.increase(8 * ONE_DAY);

      // Now successful
      expect(await milestoneEscrow.isCampaignSuccessful(0)).to.be.true;
    });
  });
});
