"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  DollarSign,
  Vote,
  Loader2,
} from "lucide-react";
import { MilestoneStatus } from "@/lib/contracts/types";

interface MilestoneCardProps {
  index: number;
  title: string;
  description: string;
  percentage: number;
  amount: string;
  deadline: string;
  daysRemaining: number;
  status: MilestoneStatus;
  proposalId?: number;
  isCreator: boolean;
  canSubmit: boolean;
  canRelease: boolean;
  isSubmitting: boolean;
  isReleasing: boolean;
  onSubmit: () => void;
  onRelease: () => void;
  onViewProposal?: () => void;
}

function getStatusBadge(status: MilestoneStatus) {
  switch (status) {
    case MilestoneStatus.Pending:
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case MilestoneStatus.Voting:
      return (
        <Badge className="bg-blue-600 flex items-center gap-1">
          <Vote className="h-3 w-3" />
          Voting
        </Badge>
      );
    case MilestoneStatus.Approved:
      return (
        <Badge className="bg-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      );
    case MilestoneStatus.Rejected:
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case MilestoneStatus.Released:
      return (
        <Badge className="bg-emerald-600 flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          Released
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

function getStatusColor(status: MilestoneStatus) {
  switch (status) {
    case MilestoneStatus.Pending:
      return "border-l-gray-400";
    case MilestoneStatus.Voting:
      return "border-l-blue-500";
    case MilestoneStatus.Approved:
      return "border-l-green-500";
    case MilestoneStatus.Rejected:
      return "border-l-red-500";
    case MilestoneStatus.Released:
      return "border-l-emerald-500";
    default:
      return "border-l-gray-400";
  }
}

export function MilestoneCard({
  index,
  title,
  description,
  percentage,
  amount,
  deadline,
  daysRemaining,
  status,
  proposalId,
  isCreator,
  canSubmit,
  canRelease,
  isSubmitting,
  isReleasing,
  onSubmit,
  onRelease,
  onViewProposal,
}: MilestoneCardProps) {
  const isDeadlinePassed = daysRemaining <= 0;

  return (
    <Card className={`border-l-4 ${getStatusColor(status)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">
              Milestone {index + 1}: {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          {getStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount and Percentage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{amount} MNT</span>
            <span className="text-muted-foreground">({percentage}%)</span>
          </div>
        </div>

        {/* Progress bar showing percentage of total */}
        <Progress value={percentage} className="h-2" />

        {/* Deadline */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Deadline: {deadline}</span>
          </div>
          {status === MilestoneStatus.Pending && (
            <span
              className={`font-medium ${
                isDeadlinePassed
                  ? "text-red-600"
                  : daysRemaining <= 7
                  ? "text-yellow-600"
                  : "text-muted-foreground"
              }`}
            >
              {isDeadlinePassed
                ? "Deadline passed"
                : `${daysRemaining} days remaining`}
            </span>
          )}
        </div>

        {/* Voting Status */}
        {status === MilestoneStatus.Voting && proposalId && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Voting in progress (Proposal #{proposalId})
              </span>
            </div>
            {onViewProposal && (
              <Button variant="link" size="sm" onClick={onViewProposal}>
                View Proposal
              </Button>
            )}
          </div>
        )}

        {/* Action Buttons - Creator only */}
        {isCreator && (
          <div className="flex gap-2">
            {/* Submit for Approval Button */}
            {canSubmit && status === MilestoneStatus.Pending && (
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit for Approval
                  </>
                )}
              </Button>
            )}

            {/* Release Funds Button */}
            {canRelease && status === MilestoneStatus.Approved && (
              <Button
                onClick={onRelease}
                disabled={isReleasing}
                variant="default"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isReleasing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Release Funds
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Status Messages */}
        {status === MilestoneStatus.Rejected && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 dark:text-red-300">
              This milestone was rejected by investors. Emergency refund may be available.
            </span>
          </div>
        )}

        {status === MilestoneStatus.Released && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              Funds have been released to the creator (minus 2% platform fee).
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
