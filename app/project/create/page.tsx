"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { toWei } from "thirdweb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ConnectButtonWrapper } from "@/components/wallet/connect-button-wrapper";
import { toast } from "sonner";
import { KR_CROWDFUNDING_RULES } from "@/lib/constants/regulations";
import { prepareCreateCampaign, getEscrowContract } from "@/lib/contracts/escrow";
import { prepareCreateCampaignWithMilestones } from "@/lib/contracts/milestones";
import { ROUTES } from "@/lib/constants/routes";
import type { ProjectCategory } from "@/lib/constants/projects";

interface MilestoneInput {
  title: string;
  description: string;
  percentage: number; // 0-100
  daysAfterEnd: number;
}

interface ProjectFormData {
  // Basic Info
  name: string;
  description: string;
  longDescription: string;
  category: ProjectCategory;

  // Funding Info
  goal: string;
  durationDays: string;

  // Token Info
  tokenSymbol: string;
  founderSharePercent: string; // 0-30%

  // Milestone Info
  useMilestones: boolean;
  milestones: MilestoneInput[];

  // Company Info
  companyName: string;
  foundedYear: string;
  employees: string;
  location: string;
  website: string;
}

const DEFAULT_MILESTONES: MilestoneInput[] = [
  { title: "Milestone 1: MVP Launch", description: "Complete MVP with core features", percentage: 30, daysAfterEnd: 30 },
  { title: "Milestone 2: Beta Release", description: "Beta version with user feedback integration", percentage: 40, daysAfterEnd: 60 },
  { title: "Milestone 3: Full Launch", description: "Production release with all planned features", percentage: 30, daysAfterEnd: 90 },
];

const INITIAL_FORM_DATA: ProjectFormData = {
  name: "",
  description: "",
  longDescription: "",
  category: "tech",
  goal: "",
  durationDays: "30",
  tokenSymbol: "",
  founderSharePercent: "0",
  useMilestones: false,
  milestones: DEFAULT_MILESTONES,
  companyName: "",
  foundedYear: "",
  employees: "",
  location: "",
  website: "",
};

const CATEGORIES: { value: ProjectCategory; label: string; icon: string }[] = [
  { value: "tech", label: "Tech/AI", icon: "💡" },
  { value: "fintech", label: "Fintech", icon: "💳" },
  { value: "healthcare", label: "Healthcare", icon: "🏥" },
  { value: "ecommerce", label: "E-commerce", icon: "🛒" },
  { value: "entertainment", label: "Entertainment", icon: "🎬" },
];

const STEPS = [
  { id: 1, title: "Basic Info", description: "Project Introduction" },
  { id: 2, title: "Funding", description: "Goal & Duration" },
  { id: 3, title: "Token", description: "Equity Token Setup" },
  { id: 4, title: "Milestones", description: "Fund Release Schedule" },
  { id: 5, title: "Company", description: "Company Details" },
  { id: 6, title: "Review", description: "Review & Submit" },
];

export default function CreateProjectPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = useMemo(() => (currentStep / STEPS.length) * 100, [currentStep]);
  const escrowContract = getEscrowContract();

  const updateFormData = (field: keyof ProjectFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: string | number) => {
    setFormData((prev) => {
      const newMilestones = [...prev.milestones];
      newMilestones[index] = { ...newMilestones[index], [field]: value };
      return { ...prev, milestones: newMilestones };
    });
  };

  const getMilestoneTotalPercentage = (): number => {
    return formData.milestones.reduce((sum, m) => sum + m.percentage, 0);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.description && formData.category);
      case 2:
        return !!(formData.goal && formData.durationDays);
      case 3:
        return !!formData.tokenSymbol;
      case 4:
        // Milestones step - validate if using milestones
        if (!formData.useMilestones) return true;
        const total = getMilestoneTotalPercentage();
        const allFilled = formData.milestones.every(
          (m) => m.title && m.description && m.percentage > 0 && m.daysAfterEnd > 0
        );
        return total === 100 && allFilled;
      case 5:
        return !!(formData.foundedYear && formData.location);
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!account?.address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!escrowContract) {
      toast.error("Contract not configured", {
        description: "Please check the contract address configuration.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert goal to wei (18 decimals for MNT)
      const goalInWei = toWei(formData.goal);
      const durationDays = parseInt(formData.durationDays);
      const tokenName = `${formData.name} Equity`;
      const tokenSymbol = formData.tokenSymbol;
      // Convert percentage to basis points (1% = 100 bps)
      const founderShareBps = parseInt(formData.founderSharePercent) * 100;

      let tx;

      if (formData.useMilestones) {
        // Prepare createCampaignWithMilestones transaction
        const milestoneTitles = formData.milestones.map((m) => m.title);
        const milestoneDescriptions = formData.milestones.map((m) => m.description);
        const milestonePercentages = formData.milestones.map((m) => m.percentage);
        const milestoneDaysAfterEnd = formData.milestones.map((m) => m.daysAfterEnd);

        tx = prepareCreateCampaignWithMilestones(
          goalInWei,
          durationDays,
          formData.name,
          tokenName,
          tokenSymbol,
          founderShareBps,
          milestoneTitles,
          milestoneDescriptions,
          milestonePercentages,
          milestoneDaysAfterEnd
        );
      } else {
        // Prepare the regular createCampaign transaction
        tx = prepareCreateCampaign(
          goalInWei,
          durationDays,
          formData.name,
          tokenName,
          tokenSymbol,
          founderShareBps
        );
      }

      // Send transaction
      const result = await sendTransaction(tx);

      toast.success("Campaign created successfully!", {
        description: `Transaction: ${result.transactionHash.slice(0, 10)}...`,
      });

      // Redirect to dashboard
      router.push(ROUTES.DASHBOARD);
    } catch (error) {
      console.error("Campaign creation failed:", error);
      toast.error("Campaign creation failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Require wallet connection
  if (!account) {
    return (
      <div className="min-h-screen bg-muted/20">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h1 className="text-2xl font-bold mb-4">Create Project</h1>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to create a project.
            </p>
            <ConnectButtonWrapper />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Create New Project</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Launch your startup crowdfunding campaign
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.id < currentStep
                        ? "bg-primary text-primary-foreground"
                        : step.id === currentStep
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted text-muted-foreground"
                    }`}
                  >
                    {step.id < currentStep ? "✓" : step.id}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project Name *</label>
                    <Input
                      placeholder="e.g., AI Startup - Auto Translation Service"
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => (
                        <Button
                          key={cat.value}
                          type="button"
                          variant={formData.category === cat.value ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => updateFormData("category", cat.value)}
                        >
                          <span className="mr-2">{cat.icon}</span>
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Short Description *</label>
                    <Input
                      placeholder="Describe your project in one line"
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/100 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detailed Description</label>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Describe your project's vision, goals, and investment highlights in detail"
                      value={formData.longDescription}
                      onChange={(e) => updateFormData("longDescription", e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Step 2: Funding Info */}
              {currentStep === 2 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Funding Goal (MNT) *</label>
                    <Input
                      type="number"
                      placeholder="e.g., 10000"
                      value={formData.goal}
                      onChange={(e) => updateFormData("goal", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Since this is testnet, you can set any amount
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Funding Duration *</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 7, 30, 45, 60].map((days) => (
                        <Button
                          key={days}
                          type="button"
                          variant={formData.durationDays === String(days) ? "default" : "outline"}
                          onClick={() => updateFormData("durationDays", String(days))}
                        >
                          {days === 1 ? "1 day" : `${days} days`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-4">
                    <h4 className="font-medium mb-2">Fee Information</h4>
                    <p className="text-sm text-muted-foreground">
                      A platform fee of {KR_CROWDFUNDING_RULES.PLATFORM_FEE_PERCENTAGE}% will be deducted upon successful funding.
                      If the goal is not met, investors will receive a full refund.
                    </p>
                  </div>
                </>
              )}

              {/* Step 3: Token Info */}
              {currentStep === 3 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Symbol *</label>
                    <Input
                      placeholder="e.g., AITS (3-5 uppercase letters)"
                      value={formData.tokenSymbol}
                      onChange={(e) => updateFormData("tokenSymbol", e.target.value.toUpperCase())}
                      maxLength={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be the symbol for the equity tokens investors receive
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Founder Token Share</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={formData.founderSharePercent}
                        onChange={(e) => updateFormData("founderSharePercent", e.target.value)}
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="w-16 text-right font-medium">
                        {formData.founderSharePercent}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Percentage of tokens reserved for the founding team (0-30%). This allows governance participation.
                    </p>
                  </div>

                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Governance Rights
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Token holders can participate in project governance by voting on proposals.
                      The founder share allows you to maintain voting power in key decisions.
                    </p>
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30 p-4">
                    <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                      Investor Disclosure
                    </h4>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                      <li>• Expected returns are not guaranteed</li>
                      <li>• Risk of principal loss exists</li>
                      <li>• Startup investment is high-risk investment</li>
                    </ul>
                  </div>
                </>
              )}

              {/* Step 4: Milestones */}
              {currentStep === 4 && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Milestone-based Fund Release</h4>
                        <p className="text-sm text-muted-foreground">
                          Release funds in stages based on project milestones
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.useMilestones}
                          onChange={(e) => updateFormData("useMilestones", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {!formData.useMilestones && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">
                          Without milestones, 100% of funds will be released to you immediately after successful funding.
                          Enable milestones to build investor trust with staged fund releases.
                        </p>
                      </div>
                    )}

                    {formData.useMilestones && (
                      <>
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
                          <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                            Investor Protection Enabled
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Funds will be released in stages as you complete milestones.
                            Investors vote to approve each milestone before funds are released.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {formData.milestones.map((milestone, index) => (
                            <div key={index} className="rounded-lg border p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-primary">
                                  Milestone {index + 1}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {milestone.percentage}% of funds
                                </span>
                              </div>

                              <div className="space-y-2">
                                <Input
                                  placeholder="Milestone title"
                                  value={milestone.title}
                                  onChange={(e) => updateMilestone(index, "title", e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <textarea
                                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  placeholder="Describe what you will deliver for this milestone"
                                  value={milestone.description}
                                  onChange={(e) => updateMilestone(index, "description", e.target.value)}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs text-muted-foreground">
                                    Fund Percentage (%)
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={milestone.percentage}
                                    onChange={(e) =>
                                      updateMilestone(index, "percentage", parseInt(e.target.value) || 0)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs text-muted-foreground">
                                    Deadline (days after funding)
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={milestone.daysAfterEnd}
                                    onChange={(e) =>
                                      updateMilestone(index, "daysAfterEnd", parseInt(e.target.value) || 0)
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className={`rounded-lg p-4 ${
                          getMilestoneTotalPercentage() === 100
                            ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Total Allocation:</span>
                            <span className={`font-bold ${
                              getMilestoneTotalPercentage() === 100
                                ? "text-green-700 dark:text-green-300"
                                : "text-red-700 dark:text-red-300"
                            }`}>
                              {getMilestoneTotalPercentage()}%
                              {getMilestoneTotalPercentage() !== 100 && " (must equal 100%)"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Step 5: Company Info */}
              {currentStep === 5 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Name</label>
                    <Input
                      placeholder="e.g., AI Tech Inc."
                      value={formData.companyName}
                      onChange={(e) => updateFormData("companyName", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Founded Year *</label>
                      <Input
                        type="number"
                        placeholder="e.g., 2023"
                        value={formData.foundedYear}
                        onChange={(e) => updateFormData("foundedYear", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Employees</label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
                        value={formData.employees}
                        onChange={(e) => updateFormData("employees", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location *</label>
                    <Input
                      placeholder="e.g., San Francisco, CA"
                      value={formData.location}
                      onChange={(e) => updateFormData("location", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      placeholder="https://example.com"
                      value={formData.website}
                      onChange={(e) => updateFormData("website", e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Step 6: Review */}
              {currentStep === 6 && (
                <>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 space-y-3">
                      <h4 className="font-medium">Project Info</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Project Name</div>
                        <div className="font-medium">{formData.name || "-"}</div>
                        <div className="text-muted-foreground">Category</div>
                        <div className="font-medium">
                          {CATEGORIES.find((c) => c.value === formData.category)?.label}
                        </div>
                        <div className="text-muted-foreground">Token Symbol</div>
                        <div className="font-medium">{formData.tokenSymbol || "-"}</div>
                        <div className="text-muted-foreground">Founder Share</div>
                        <div className="font-medium">{formData.founderSharePercent}%</div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 space-y-3">
                      <h4 className="font-medium">Funding Info</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Funding Goal</div>
                        <div className="font-medium">{Number(formData.goal || 0).toLocaleString()} MNT</div>
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">{formData.durationDays} days</div>
                        <div className="text-muted-foreground">Fund Release</div>
                        <div className="font-medium">
                          {formData.useMilestones ? "Milestone-based" : "Immediate (100%)"}
                        </div>
                      </div>
                    </div>

                    {formData.useMilestones && (
                      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 p-4 space-y-3">
                        <h4 className="font-medium text-green-800 dark:text-green-200">
                          Milestone Schedule
                        </h4>
                        <div className="space-y-2">
                          {formData.milestones.map((milestone, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {milestone.title || `Milestone ${index + 1}`}
                              </span>
                              <span className="font-medium">
                                {milestone.percentage}% ({milestone.daysAfterEnd} days)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border p-4 space-y-3">
                      <h4 className="font-medium">Company Info</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Founded</div>
                        <div className="font-medium">{formData.foundedYear}</div>
                        <div className="text-muted-foreground">Location</div>
                        <div className="font-medium">{formData.location}</div>
                        {formData.employees && (
                          <>
                            <div className="text-muted-foreground">Employees</div>
                            <div className="font-medium">{formData.employees}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-primary/10 p-4">
                      <p className="text-sm">
                        <span className="font-medium">Receiving Wallet:</span>{" "}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {account.address}
                        </code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Funds will be sent to this wallet upon successful funding
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            {/* Navigation Buttons */}
            <Separator />
            <div className="p-6 flex justify-between">
              {currentStep > 1 ? (
                <Button variant="outline" onClick={handlePrev}>
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Submitting...
                    </span>
                  ) : (
                    "Submit Project"
                  )}
                </Button>
              )}
            </div>
          </Card>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need help?</p>
            <p className="mt-1">
              <Link href="/" className="text-primary hover:underline">
                View FAQ
              </Link>
              {" · "}
              <a href="mailto:support@crowdmantle.com" className="text-primary hover:underline">
                Contact Us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
