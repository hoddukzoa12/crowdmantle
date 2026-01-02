import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting MilestoneEscrow & GovernanceV2 deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "MNT\n");

  if (balance === BigInt(0)) {
    console.error("❌ Deployer has no MNT. Please fund the wallet first.");
    console.log("🔗 Faucet: https://faucet.sepolia.mantle.xyz");
    process.exit(1);
  }

  // Platform wallet address (receives 2% fees)
  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
  console.log("🏦 Platform wallet:", platformWallet);

  // Deploy MilestoneEscrow
  console.log("\n📦 Deploying MilestoneEscrow...");
  const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
  const escrow = await MilestoneEscrow.deploy(platformWallet);

  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  console.log("✅ MilestoneEscrow deployed to:", escrowAddress);

  // Get deployment transaction details
  const deployTx = escrow.deploymentTransaction();
  if (deployTx) {
    console.log("📋 Transaction hash:", deployTx.hash);
    const receipt = await deployTx.wait();
    if (receipt) {
      console.log("⛽ Gas used:", receipt.gasUsed.toString());
    }
  }

  // Deploy GovernanceV2
  console.log("\n📦 Deploying GovernanceV2...");
  const GovernanceV2 = await ethers.getContractFactory("GovernanceV2");
  const governance = await GovernanceV2.deploy(escrowAddress);

  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();

  console.log("✅ GovernanceV2 deployed to:", governanceAddress);

  // Get governance deployment transaction details
  const govDeployTx = governance.deploymentTransaction();
  if (govDeployTx) {
    console.log("📋 Transaction hash:", govDeployTx.hash);
    const govReceipt = await govDeployTx.wait();
    if (govReceipt) {
      console.log("⛽ Gas used:", govReceipt.gasUsed.toString());
    }
  }

  // Set governance contract on MilestoneEscrow
  console.log("\n🔗 Linking contracts...");
  const setGovTx = await escrow.setGovernanceContract(governanceAddress);
  await setGovTx.wait();
  console.log("✅ GovernanceV2 linked to MilestoneEscrow");

  // Log contract info
  console.log("\n========================================");
  console.log("📄 DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("");
  console.log("MilestoneEscrow:", escrowAddress);
  console.log("GovernanceV2:", governanceAddress);
  console.log("Platform Wallet:", platformWallet);
  console.log("Platform Fee: 2% (200 bps)");
  console.log("Max Founder Share: 30% (3000 bps)");
  console.log("Max Milestones: 3");
  console.log("Voting Period: 3 days");
  console.log("========================================\n");

  // Update addresses.ts file
  const addressesPath = path.join(__dirname, "../lib/constants/addresses.ts");
  if (fs.existsSync(addressesPath)) {
    let content = fs.readFileSync(addressesPath, "utf8");

    // Check if MILESTONE_ESCROW exists, if not add it
    if (!content.includes("MILESTONE_ESCROW")) {
      // Add new contract addresses after GOVERNANCE line
      content = content.replace(
        /GOVERNANCE: "0x[a-fA-F0-9]{40}",/,
        `GOVERNANCE: "0xAD594DFf154C4d47dA35A180Abc022Ae4dC3Af27",

  // MilestoneEscrow contract address (milestone-based fund release)
  MILESTONE_ESCROW: "${escrowAddress}",

  // GovernanceV2 contract address (extended governance with milestone proposals)
  GOVERNANCE_V2: "${governanceAddress}",`
      );
    } else {
      // Update existing addresses
      content = content.replace(
        /MILESTONE_ESCROW: "0x[a-fA-F0-9]{40}"/,
        `MILESTONE_ESCROW: "${escrowAddress}"`
      );
      content = content.replace(
        /GOVERNANCE_V2: "0x[a-fA-F0-9]{40}"/,
        `GOVERNANCE_V2: "${governanceAddress}"`
      );
    }

    // Update PLATFORM_WALLET if needed
    content = content.replace(
      /PLATFORM_WALLET: "0x[a-fA-F0-9]{40}"/,
      `PLATFORM_WALLET: "${platformWallet}"`
    );

    fs.writeFileSync(addressesPath, content);
    console.log("✅ Updated lib/constants/addresses.ts with deployed addresses\n");
  }

  // Save deployment info to file
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MilestoneEscrow: escrowAddress,
      GovernanceV2: governanceAddress,
    },
    platformWallet,
    transactionHash: {
      escrow: deployTx?.hash,
      governance: govDeployTx?.hash,
      linking: setGovTx.hash,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = (await ethers.provider.getNetwork()).name || "unknown";
  const deploymentFile = path.join(deploymentsDir, `milestone-${networkName}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📁 Deployment info saved to:", deploymentFile);

  // Verification instructions
  console.log("\n========================================");
  console.log("🔍 VERIFICATION");
  console.log("========================================");
  console.log("To verify the contracts on Mantlescan, run:");
  console.log(`npx hardhat verify --network mantleSepolia ${escrowAddress} "${platformWallet}"`);
  console.log(`npx hardhat verify --network mantleSepolia ${governanceAddress} "${escrowAddress}"`);
  console.log("");
  console.log("View on Explorer:");
  console.log(`MilestoneEscrow: https://sepolia.mantlescan.xyz/address/${escrowAddress}`);
  console.log(`GovernanceV2: https://sepolia.mantlescan.xyz/address/${governanceAddress}`);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
