import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting CrowdfundingEscrow deployment...\n");

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
  // Use deployer address as platform wallet for testing
  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
  console.log("🏦 Platform wallet:", platformWallet);

  // Deploy CrowdfundingEscrow
  console.log("\n📦 Deploying CrowdfundingEscrow...");
  const CrowdfundingEscrow = await ethers.getContractFactory("CrowdfundingEscrow");
  const escrow = await CrowdfundingEscrow.deploy(platformWallet);

  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  console.log("✅ CrowdfundingEscrow deployed to:", escrowAddress);

  // Get deployment transaction details
  const deployTx = escrow.deploymentTransaction();
  if (deployTx) {
    console.log("📋 Transaction hash:", deployTx.hash);
    const receipt = await deployTx.wait();
    if (receipt) {
      console.log("⛽ Gas used:", receipt.gasUsed.toString());
    }
  }

  // Deploy Governance
  console.log("\n📦 Deploying Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(escrowAddress);

  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();

  console.log("✅ Governance deployed to:", governanceAddress);

  // Get governance deployment transaction details
  const govDeployTx = governance.deploymentTransaction();
  if (govDeployTx) {
    console.log("📋 Transaction hash:", govDeployTx.hash);
    const govReceipt = await govDeployTx.wait();
    if (govReceipt) {
      console.log("⛽ Gas used:", govReceipt.gasUsed.toString());
    }
  }

  // Log contract info
  console.log("\n========================================");
  console.log("📄 DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("");
  console.log("CrowdfundingEscrow:", escrowAddress);
  console.log("Governance:", governanceAddress);
  console.log("Platform Wallet:", platformWallet);
  console.log("Platform Fee: 2% (200 bps)");
  console.log("Max Founder Share: 30% (3000 bps)");
  console.log("Min Duration: 1 day");
  console.log("========================================\n");

  // Update addresses.ts file
  const addressesPath = path.join(__dirname, "../lib/constants/addresses.ts");
  if (fs.existsSync(addressesPath)) {
    let content = fs.readFileSync(addressesPath, "utf8");

    // Update CROWDFUNDING_ESCROW address
    content = content.replace(
      /CROWDFUNDING_ESCROW: "0x[a-fA-F0-9]{40}"/,
      `CROWDFUNDING_ESCROW: "${escrowAddress}"`
    );

    // Update GOVERNANCE address
    content = content.replace(
      /GOVERNANCE: "0x[a-fA-F0-9]{40}"/,
      `GOVERNANCE: "${governanceAddress}"`
    );

    // Update PLATFORM_WALLET address
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
      CrowdfundingEscrow: escrowAddress,
      Governance: governanceAddress,
    },
    platformWallet,
    transactionHash: {
      escrow: deployTx?.hash,
      governance: govDeployTx?.hash,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = (await ethers.provider.getNetwork()).name || "unknown";
  const deploymentFile = path.join(deploymentsDir, `${networkName}-${Date.now()}.json`);
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
  console.log(`CrowdfundingEscrow: https://sepolia.mantlescan.xyz/address/${escrowAddress}`);
  console.log(`Governance: https://sepolia.mantlescan.xyz/address/${governanceAddress}`);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
