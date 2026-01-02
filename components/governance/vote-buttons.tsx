"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Play, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { mantleSepolia } from "@/lib/thirdweb/chains";
import { client } from "@/lib/thirdweb/client";
import {
  prepareVote,
  prepareExecuteProposal,
  hasAddressVoted,
  getVoteWeight,
} from "@/lib/contracts/governance";

interface VoteButtonsProps {
  proposalId: number;
  equityTokenAddress: string;
  showExecute?: boolean;
}

export function VoteButtons({ proposalId, equityTokenAddress, showExecute }: VoteButtonsProps) {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();
  const [hasVoted, setHasVoted] = useState(false);
  const [voteWeight, setVoteWeight] = useState<bigint>(BigInt(0));
  const [isChecking, setIsChecking] = useState(true);

  // Get token balance for voting power display
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

  // Check if user has already voted
  useEffect(() => {
    async function checkVoteStatus() {
      if (!account) {
        setIsChecking(false);
        return;
      }

      try {
        const voted = await hasAddressVoted(proposalId, account.address);
        setHasVoted(voted);

        if (voted) {
          const weight = await getVoteWeight(proposalId, account.address);
          setVoteWeight(weight);
        }
      } catch (error) {
        console.error("Error checking vote status:", error);
      } finally {
        setIsChecking(false);
      }
    }

    checkVoteStatus();
  }, [account, proposalId]);

  const handleVote = (support: boolean) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!tokenBalance || tokenBalance === BigInt(0)) {
      toast.error("You need tokens to vote");
      return;
    }

    try {
      const tx = prepareVote(proposalId, support);
      sendTx(tx, {
        onSuccess: () => {
          toast.success(`Vote ${support ? "For" : "Against"} submitted!`);
          setHasVoted(true);
        },
        onError: (error) => {
          console.error("Vote failed:", error);
          toast.error(error.message || "Failed to submit vote");
        },
      });
    } catch (error) {
      console.error("Error preparing vote:", error);
      toast.error("Failed to prepare vote transaction");
    }
  };

  const handleExecute = () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const tx = prepareExecuteProposal(proposalId);
      sendTx(tx, {
        onSuccess: () => {
          toast.success("Proposal executed successfully!");
        },
        onError: (error) => {
          console.error("Execute failed:", error);
          toast.error(error.message || "Failed to execute proposal");
        },
      });
    } catch (error) {
      console.error("Error preparing execute:", error);
      toast.error("Failed to prepare execution transaction");
    }
  };

  if (!account) {
    return (
      <div className="text-center text-sm text-muted-foreground py-2">
        Connect wallet to vote
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Checking vote status...</span>
      </div>
    );
  }

  // Show execute button
  if (showExecute) {
    return (
      <Button
        onClick={handleExecute}
        disabled={isPending}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Execute Proposal
          </>
        )}
      </Button>
    );
  }

  // User has already voted
  if (hasVoted) {
    const formattedWeight = Number(voteWeight / BigInt(10 ** 18)).toLocaleString();
    return (
      <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>You voted with {formattedWeight} tokens</span>
      </div>
    );
  }

  // Check if user has tokens
  const hasTokens = tokenBalance && tokenBalance > BigInt(0);
  const formattedBalance = tokenBalance
    ? Number(tokenBalance / BigInt(10 ** 18)).toLocaleString()
    : "0";

  return (
    <div className="space-y-2">
      {hasTokens && (
        <div className="text-center text-xs text-muted-foreground">
          Your voting power: {formattedBalance} tokens
        </div>
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => handleVote(true)}
          disabled={isPending || !hasTokens}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ThumbsUp className="h-4 w-4 mr-2" />
              For
            </>
          )}
        </Button>
        <Button
          onClick={() => handleVote(false)}
          disabled={isPending || !hasTokens}
          variant="destructive"
          className="flex-1"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ThumbsDown className="h-4 w-4 mr-2" />
              Against
            </>
          )}
        </Button>
      </div>
      {!hasTokens && (
        <div className="text-center text-xs text-muted-foreground">
          You need tokens to vote on proposals
        </div>
      )}
    </div>
  );
}
