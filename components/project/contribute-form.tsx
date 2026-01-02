"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ConnectButtonWrapper } from "@/components/wallet/connect-button-wrapper";
import { type Project } from "@/lib/constants/projects";
import {
  KR_CROWDFUNDING_RULES,
  checkInvestmentLimit,
  CONFIRMATION_STEPS,
  RISK_WARNINGS,
} from "@/lib/constants/regulations";
import { useInvestment, useProjectInvestment } from "@/src/presentation/hooks";

interface ContributeFormProps {
  project: Project;
  campaignId?: number; // Campaign ID from unified MilestoneEscrow contract
}

export function ContributeForm({ project, campaignId = 0 }: ContributeFormProps) {
  const account = useActiveAccount();
  const [amount, setAmount] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(0);
  const [transactionStep, setTransactionStep] = useState<"idle" | "pledging" | "success" | "error">("idle");

  // Use unified investment hook with MilestoneEscrow contract
  const { invest, isInvesting, currentStep, error: investError } = useInvestment();
  const { balance: pledgeBalance, refetch: refetchBalance } = useProjectInvestment(campaignId);

  // Mock previous investments (in production, fetch from contract/db)
  const previousInvestments = 0;

  const numAmount = Number(amount) || 0;
  const limitCheck = checkInvestmentLimit(numAmount, previousInvestments);

  const canInvest =
    numAmount > 0 && limitCheck.isAllowed && project.status === "active";

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    const cleaned = value.replace(/[^0-9.]/g, "");
    setAmount(cleaned);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleOpenDialog = () => {
    if (!canInvest) return;
    setConfirmationStep(0);
    setIsDialogOpen(true);
  };

  const handleConfirmStep = () => {
    if (confirmationStep < CONFIRMATION_STEPS.length - 1) {
      setConfirmationStep(confirmationStep + 1);
    } else {
      handleSubmitInvestment();
    }
  };

  const handleSubmitInvestment = async () => {
    if (!account?.address) {
      toast.error("Wallet not connected");
      return;
    }

    if (campaignId < 0) {
      toast.error("Invalid campaign", {
        description: "This project is not linked to a blockchain campaign yet.",
      });
      return;
    }

    setTransactionStep("pledging");

    try {
      // Execute pledge via unified MilestoneEscrow contract
      const success = await invest({
        campaignId,
        amountMnt: amount,
      });

      if (success) {
        setTransactionStep("success");

        // Refetch pledge balance
        await refetchBalance();

        toast.success("Investment pledged!", {
          description: `Pledged ${numAmount} MNT to ${project.name}. Tokens will be issued after funding succeeds.`,
          action: {
            label: "View on Explorer",
            onClick: () =>
              window.open("https://explorer.sepolia.mantle.xyz", "_blank"),
          },
        });

        // Close dialog after short delay to show success state
        setTimeout(() => {
          setIsDialogOpen(false);
          setAmount("");
          setConfirmationStep(0);
          setTransactionStep("idle");
        }, 2000);
      } else {
        throw new Error(investError || "An error occurred while processing the investment");
      }
    } catch (error) {
      console.error("Investment failed:", error);
      setTransactionStep("error");
      toast.error("Investment Failed", {
        description: error instanceof Error ? error.message : "An error occurred during transaction. Please try again.",
      });
    }
  };

  // If not connected, show connect button
  if (!account) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold mb-2">Invest</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your wallet to start investing
        </p>
        <ConnectButtonWrapper />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Invest</h3>

      {/* Amount Input */}
      <div className="space-y-3">
        <div className="relative">
          <Input
            type="text"
            placeholder="Investment amount"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="pr-16 text-lg"
            disabled={project.status !== "active"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            MNT
          </span>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2">
          {[10, 50, 100, 200].map((value) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(value)}
              disabled={project.status !== "active"}
              className="flex-1"
            >
              {value}
            </Button>
          ))}
        </div>

        {/* Limit Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Annual Limit</span>
            <span>{KR_CROWDFUNDING_RULES.INDIVIDUAL_ANNUAL_LIMIT_USDC} MNT</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining Limit</span>
            <span className="font-medium">
              {KR_CROWDFUNDING_RULES.INDIVIDUAL_ANNUAL_LIMIT_USDC - previousInvestments} MNT
            </span>
          </div>
        </div>

        {/* Validation Messages */}
        {numAmount > 0 && !limitCheck.isAllowed && (
          <p className="text-xs text-destructive">{limitCheck.message}</p>
        )}

        <Separator />

        {/* Summary */}
        {numAmount > 0 && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Investment Amount</span>
              <span>{numAmount.toLocaleString()} MNT</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full"
              size="lg"
              disabled={!canInvest}
              onClick={handleOpenDialog}
            >
              {project.status !== "active"
                ? "Funding Closed"
                : !numAmount
                ? "Enter Amount"
                : !limitCheck.isAllowed
                ? "Limit Exceeded"
                : "Invest"}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {CONFIRMATION_STEPS[confirmationStep]?.title || "Confirm Investment"}
              </DialogTitle>
              <DialogDescription>
                {CONFIRMATION_STEPS[confirmationStep]?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Progress Indicator */}
              <div className="flex justify-center gap-2">
                {CONFIRMATION_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-8 rounded-full ${
                      index <= confirmationStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              {/* Step Content */}
              {confirmationStep === 0 && (
                <div className="space-y-2 text-sm">
                  <p className="text-destructive">{RISK_WARNINGS.PRINCIPAL_LOSS}</p>
                  <p className="text-destructive">{RISK_WARNINGS.STARTUP_RISK}</p>
                  <p className="text-muted-foreground">{RISK_WARNINGS.NO_GUARANTEE}</p>
                </div>
              )}

              {confirmationStep === 1 && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p>
                    Annual Individual Investment Limit:{" "}
                    <span className="font-semibold">
                      {KR_CROWDFUNDING_RULES.INDIVIDUAL_ANNUAL_LIMIT_USDC} MNT
                    </span>
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    (Based on securities crowdfunding regulations)
                  </p>
                </div>
              )}

              {confirmationStep === 2 && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-sm text-green-800 dark:text-green-200">
                  <p className="font-medium">100% Refund Guarantee</p>
                  <p className="mt-1 text-green-700 dark:text-green-300">
                    Your investment will be automatically refunded if the funding goal is not met.
                  </p>
                </div>
              )}

              {confirmationStep === 3 && (
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project</span>
                      <span className="font-medium">{project.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Investment</span>
                      <span className="font-medium">{numAmount.toLocaleString()} MNT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token</span>
                      <span className="font-medium">{project.tokenSymbol}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {confirmationStep > 0 && !isInvesting && transactionStep === "idle" && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmationStep(confirmationStep - 1)}
                  disabled={isInvesting}
                >
                  Previous
                </Button>
              )}
              <Button
                onClick={handleConfirmStep}
                disabled={isInvesting || transactionStep === "success"}
                className="flex-1"
              >
                {transactionStep === "success" ? (
                  "Investment Complete!"
                ) : isInvesting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {currentStep === "pledging" && "Pledging MNT..."}
                    {!currentStep && "Processing..."}
                  </span>
                ) : confirmationStep === CONFIRMATION_STEPS.length - 1 ? (
                  "Confirm Investment"
                ) : (
                  "I Understand"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Connected Account Info */}
        <div className="text-xs text-center text-muted-foreground">
          Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>

        {/* Current Pledge Amount */}
        {pledgeBalance && pledgeBalance.pledgeAmount > BigInt(0) && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-700 dark:text-blue-300">
              Your Pledged Amount
            </div>
            <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              {pledgeBalance.formatted} MNT
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Tokens will be issued after funding succeeds
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
