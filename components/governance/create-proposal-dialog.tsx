"use client";

import { useState } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { mantleSepolia } from "@/lib/thirdweb/chains";
import { client } from "@/lib/thirdweb/client";
import { prepareCreateProposal } from "@/lib/contracts/governance";

interface CreateProposalDialogProps {
  campaignId: number;
  equityTokenAddress: string;
}

export function CreateProposalDialog({ campaignId, equityTokenAddress }: CreateProposalDialogProps) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Get token balance and total supply for threshold check
  const tokenContract = getContract({
    client,
    chain: mantleSepolia,
    address: equityTokenAddress,
  });

  const { data: tokenBalance } = useReadContract({
    contract: tokenContract,
    method: "function balanceOf(address) view returns (uint256)",
    params: account ? [account.address] : ["0x0000000000000000000000000000000000000000"],
  });

  const { data: totalSupply } = useReadContract({
    contract: tokenContract,
    method: "function totalSupply() view returns (uint256)",
  });

  // Check if user has 1% of total supply (minimum threshold)
  const hasMinimumTokens =
    tokenBalance &&
    totalSupply &&
    tokenBalance >= (totalSupply * BigInt(1)) / BigInt(100);

  const tokenPercentage =
    tokenBalance && totalSupply && totalSupply > BigInt(0)
      ? Number((tokenBalance * BigInt(10000)) / totalSupply) / 100
      : 0;

  const handleSubmit = () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a proposal title");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a proposal description");
      return;
    }

    if (!hasMinimumTokens) {
      toast.error("You need at least 1% of tokens to create a proposal");
      return;
    }

    try {
      const tx = prepareCreateProposal(campaignId, title.trim(), description.trim());
      sendTx(tx, {
        onSuccess: () => {
          toast.success("Proposal created successfully!");
          setOpen(false);
          setTitle("");
          setDescription("");
          // Reload page to show new proposal
          window.location.reload();
        },
        onError: (error) => {
          console.error("Create proposal failed:", error);
          toast.error(error.message || "Failed to create proposal");
        },
      });
    } catch (error) {
      console.error("Error preparing proposal:", error);
      toast.error("Failed to prepare proposal transaction");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Proposal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
          <DialogDescription>
            Submit a proposal for token holders to vote on.
            Voting period is 3 days.
          </DialogDescription>
        </DialogHeader>

        {!hasMinimumTokens && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Insufficient tokens</p>
              <p className="text-muted-foreground">
                You need at least 1% of total token supply to create a proposal.
                {tokenPercentage > 0 && (
                  <> You currently hold {tokenPercentage.toFixed(2)}%.</>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter proposal title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your proposal in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/1000 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !hasMinimumTokens || !title.trim() || !description.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Proposal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
