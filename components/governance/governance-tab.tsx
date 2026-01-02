"use client";

import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, AlertCircle } from "lucide-react";
import { ProposalList } from "./proposal-list";
import { CreateProposalDialog } from "./create-proposal-dialog";
import { CampaignData } from "@/lib/contracts/escrow";

// Helper function to compute campaign status (called outside component)
function computeCampaignStatus(campaign: CampaignData) {
  const now = Math.floor(Date.now() / 1000);
  const isEnded = now >= Number(campaign.endAt);
  const isSuccessful = isEnded && campaign.pledged >= campaign.goal;
  return { isEnded, isSuccessful };
}

interface GovernanceTabProps {
  campaignId: number;
  campaign: CampaignData;
  equityTokenAddress: string;
}

export function GovernanceTab({ campaignId, campaign, equityTokenAddress }: GovernanceTabProps) {
  const account = useActiveAccount();

  // Check if campaign is successful (ended and goal reached)
  const { isEnded, isSuccessful } = computeCampaignStatus(campaign);

  // If campaign not successful, show message
  if (!isSuccessful) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Governance
          </CardTitle>
          <CardDescription>
            Token holder voting for project decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Governance Not Available Yet</h3>
            <p className="text-muted-foreground max-w-md">
              {!isEnded
                ? "Governance will be available after the campaign ends successfully."
                : "This campaign did not reach its funding goal. Governance is not available."}
            </p>
            {!isEnded && (
              <Badge variant="outline" className="mt-4">
                Campaign in Progress
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Proposal Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5" />
                Governance
              </CardTitle>
              <CardDescription className="mt-1">
                Token holders can create proposals and vote on project decisions
              </CardDescription>
            </div>
            {account && (
              <CreateProposalDialog
                campaignId={campaignId}
                equityTokenAddress={equityTokenAddress}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!account ? (
            <div className="text-center py-4 text-muted-foreground">
              Connect your wallet to participate in governance
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>
                Voting power is based on your token holdings.
                You need at least 1% of total supply to create a proposal.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal List */}
      <ProposalList
        campaignId={campaignId}
        equityTokenAddress={equityTokenAddress}
      />
    </div>
  );
}
