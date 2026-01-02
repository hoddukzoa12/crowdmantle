"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Circle,
  Clock,
  Vote,
  XCircle,
  DollarSign,
} from "lucide-react";
import { MilestoneStatus } from "@/lib/contracts/types";

interface MilestoneProgressCardProps {
  milestones: Array<{
    title: string;
    status: MilestoneStatus;
    percentage: number;
  }>;
  releasedAmount: string;
  totalAmount: string;
  releasedPercent: number;
}

function getStatusIcon(status: MilestoneStatus, isActive: boolean) {
  const baseClass = isActive ? "h-6 w-6" : "h-5 w-5";

  switch (status) {
    case MilestoneStatus.Released:
      return (
        <div className={`rounded-full bg-emerald-600 p-1 ${isActive ? 'ring-4 ring-emerald-200 dark:ring-emerald-900' : ''}`}>
          <CheckCircle className={`${baseClass} text-white`} />
        </div>
      );
    case MilestoneStatus.Approved:
      return (
        <div className={`rounded-full bg-green-600 p-1 ${isActive ? 'ring-4 ring-green-200 dark:ring-green-900' : ''}`}>
          <DollarSign className={`${baseClass} text-white`} />
        </div>
      );
    case MilestoneStatus.Voting:
      return (
        <div className={`rounded-full bg-blue-600 p-1 ${isActive ? 'ring-4 ring-blue-200 dark:ring-blue-900' : ''}`}>
          <Vote className={`${baseClass} text-white`} />
        </div>
      );
    case MilestoneStatus.Rejected:
      return (
        <div className={`rounded-full bg-red-600 p-1 ${isActive ? 'ring-4 ring-red-200 dark:ring-red-900' : ''}`}>
          <XCircle className={`${baseClass} text-white`} />
        </div>
      );
    case MilestoneStatus.Pending:
    default:
      return (
        <div className={`rounded-full bg-gray-300 dark:bg-gray-600 p-1 ${isActive ? 'ring-4 ring-gray-200 dark:ring-gray-700' : ''}`}>
          {isActive ? (
            <Clock className={`${baseClass} text-gray-700 dark:text-gray-300`} />
          ) : (
            <Circle className={`${baseClass} text-gray-500 dark:text-gray-400`} />
          )}
        </div>
      );
  }
}

function getStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.Pending:
      return "Pending";
    case MilestoneStatus.Voting:
      return "Voting";
    case MilestoneStatus.Approved:
      return "Approved";
    case MilestoneStatus.Rejected:
      return "Rejected";
    case MilestoneStatus.Released:
      return "Released";
    default:
      return "Unknown";
  }
}

function getConnectorColor(status: MilestoneStatus) {
  if (status === MilestoneStatus.Released) {
    return "bg-emerald-500";
  }
  if (status === MilestoneStatus.Approved || status === MilestoneStatus.Voting) {
    return "bg-blue-500";
  }
  if (status === MilestoneStatus.Rejected) {
    return "bg-red-500";
  }
  return "bg-gray-300 dark:bg-gray-600";
}

export function MilestoneProgressCard({
  milestones,
  releasedAmount,
  totalAmount,
  releasedPercent,
}: MilestoneProgressCardProps) {
  // Find the first non-released milestone (active one)
  const activeIndex = milestones.findIndex(
    (m) => m.status !== MilestoneStatus.Released
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Milestone Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline */}
        <div className="relative">
          {/* Background connector line - behind all icons */}
          <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-gray-300 dark:bg-gray-600" />

          {/* Progress line overlay - shows completed portion */}
          {(() => {
            const releasedCount = milestones.filter(m => m.status === MilestoneStatus.Released).length;
            const progressPercent = milestones.length > 1
              ? (releasedCount / (milestones.length - 1)) * 80
              : 0;
            return progressPercent > 0 ? (
              <div
                className="absolute top-[18px] left-[10%] h-0.5 bg-emerald-500"
                style={{ width: `${progressPercent}%` }}
              />
            ) : null;
          })()}

          <div className="flex justify-between items-start">
            {milestones.map((milestone, index) => {
              const isActive = index === activeIndex ||
                (activeIndex === -1 && index === milestones.length - 1);

              return (
                <div
                  key={index}
                  className="flex flex-col items-center flex-1"
                >
                  {/* Icon - positioned above the line with background to cover line */}
                  <div className="relative z-10 bg-background p-0.5 rounded-full">
                    {getStatusIcon(milestone.status, isActive)}
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium truncate max-w-[80px]">
                      M{index + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.percentage}%
                    </p>
                    <p
                      className={`text-xs ${
                        isActive ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {getStatusLabel(milestone.status)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Released Amount Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Released Funds</span>
            <span className="font-medium">
              {releasedAmount} / {totalAmount} MNT
            </span>
          </div>
          <Progress value={releasedPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{releasedPercent}% released</span>
            <span>{100 - releasedPercent}% remaining</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-2 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <span>Voting</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-600" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-600" />
            <span>Released</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-600" />
            <span>Rejected</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
