"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, ThumbsUp, ThumbsDown, CheckCircle, XCircle } from "lucide-react";
import { VoteButtons } from "./vote-buttons";
import { formatTimeRemaining } from "@/lib/contracts/governance";

interface FormattedProposal {
  id: number;
  campaignId: bigint;
  proposer: string;
  title: string;
  description: string;
  forVotes: string;
  againstVotes: string;
  totalVotes: string;
  startTime: Date;
  endTime: Date;
  executed: boolean;
  canceled: boolean;
  isActive: boolean;
  isEnded: boolean;
  forPercent: number;
  againstPercent: number;
  passed: boolean;
  timeRemaining: number;
}

interface ProposalCardProps {
  proposal: FormattedProposal;
  equityTokenAddress: string;
}

function getStatusBadge(proposal: FormattedProposal) {
  if (proposal.canceled) {
    return <Badge variant="destructive">Canceled</Badge>;
  }
  if (proposal.executed) {
    return <Badge className="bg-green-600">Executed</Badge>;
  }
  if (proposal.isActive) {
    return <Badge className="bg-blue-600">Active</Badge>;
  }
  if (proposal.isEnded) {
    if (proposal.passed) {
      return <Badge className="bg-green-600">Passed</Badge>;
    }
    return <Badge variant="secondary">Failed</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
}

function formatVoteCount(votes: string): string {
  const num = BigInt(votes);
  const decimals = BigInt(10 ** 18);
  const whole = num / decimals;
  if (whole >= BigInt(1000000)) {
    return `${(Number(whole) / 1000000).toFixed(1)}M`;
  }
  if (whole >= BigInt(1000)) {
    return `${(Number(whole) / 1000).toFixed(1)}K`;
  }
  return whole.toString();
}

export function ProposalCard({ proposal, equityTokenAddress }: ProposalCardProps) {
  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">
              #{proposal.id}: {proposal.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {proposal.description}
            </p>
          </div>
          {getStatusBadge(proposal)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voting Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              <span>For: {formatVoteCount(proposal.forVotes)} ({proposal.forPercent}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-600" />
              <span>Against: {formatVoteCount(proposal.againstVotes)} ({proposal.againstPercent}%)</span>
            </div>
          </div>
          <div className="flex gap-1 h-2">
            <Progress
              value={proposal.forPercent}
              className="flex-1 [&>div]:bg-green-600"
            />
            <Progress
              value={proposal.againstPercent}
              className="flex-1 [&>div]:bg-red-600"
            />
          </div>
        </div>

        {/* Time Remaining / Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {proposal.isActive ? (
              <span>{formatTimeRemaining(proposal.timeRemaining)}</span>
            ) : proposal.isEnded ? (
              <span>Voting ended {proposal.endTime.toLocaleDateString()}</span>
            ) : (
              <span>Starts {proposal.startTime.toLocaleDateString()}</span>
            )}
          </div>
          {proposal.isEnded && !proposal.executed && !proposal.canceled && (
            <div className="flex items-center gap-1">
              {proposal.passed ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Ready to Execute</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Not Passed</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Proposer info */}
        <div className="text-xs text-muted-foreground">
          Proposed by: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
        </div>

        {/* Vote Buttons - only show if active */}
        {proposal.isActive && (
          <VoteButtons
            proposalId={proposal.id}
            equityTokenAddress={equityTokenAddress}
          />
        )}

        {/* Execute Button - show if passed but not executed */}
        {proposal.isEnded && proposal.passed && !proposal.executed && !proposal.canceled && (
          <VoteButtons
            proposalId={proposal.id}
            equityTokenAddress={equityTokenAddress}
            showExecute
          />
        )}
      </CardContent>
    </Card>
  );
}
