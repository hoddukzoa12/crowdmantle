"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { ProposalCard } from "./proposal-card";
import {
  getCampaignProposalsWithDetails,
  ProposalData,
  formatProposalForDisplay,
} from "@/lib/contracts/governance";

interface ProposalListProps {
  campaignId: number;
  equityTokenAddress: string;
}

export function ProposalList({ campaignId, equityTokenAddress }: ProposalListProps) {
  const [proposals, setProposals] = useState<(ProposalData & { id: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProposals() {
      setIsLoading(true);
      try {
        const result = await getCampaignProposalsWithDetails(campaignId);
        // Sort by ID descending (newest first)
        result.sort((a, b) => b.id - a.id);
        setProposals(result);
      } catch (error) {
        console.error("Error fetching proposals:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProposals();
  }, [campaignId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proposals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proposals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No proposals yet</p>
            <p className="text-sm mt-1">
              Be the first to create a proposal for this project
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Proposals ({proposals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.map((proposal) => {
          const formatted = formatProposalForDisplay(proposal);
          return (
            <ProposalCard
              key={proposal.id}
              proposal={formatted}
              equityTokenAddress={equityTokenAddress}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
