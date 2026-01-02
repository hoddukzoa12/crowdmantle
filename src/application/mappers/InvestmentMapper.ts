/**
 * Investment Mapper - Application Layer
 * Maps between Investment entity and InvestmentDTO
 */

import { Investment, InvestmentProps } from '@/src/domain/entities';
import { Money, Address } from '@/src/domain/value-objects';
import { InvestmentDTO, InvestmentSummaryDTO } from '@/src/application/dto';

const MANTLE_EXPLORER_URL = 'https://sepolia.mantlescan.xyz';

export class InvestmentMapper {
  /**
   * Map Investment entity to InvestmentDTO
   */
  static toDTO(investment: Investment, projectName?: string): InvestmentDTO {
    return {
      id: investment.id,
      projectId: investment.projectId,
      projectName: projectName,
      investor: investment.investor.toString(),
      amount: investment.amount.toNumber(),
      currency: investment.amount.getCurrency(),
      platformFee: investment.platformFee.toNumber(),
      totalAmount: investment.totalAmount.toNumber(),
      tokenAmount: investment.tokenAmount,
      tokenSymbol: investment.tokenSymbol,
      transactionHash: investment.transactionHash,
      status: investment.status,
      createdAt: investment.createdAt.toISOString(),
      confirmedAt: investment.confirmedAt?.toISOString(),
      refundedAt: investment.refundedAt?.toISOString(),
      explorerUrl: `${MANTLE_EXPLORER_URL}/tx/${investment.transactionHash}`,
    };
  }

  /**
   * Map Investment entity to InvestmentSummaryDTO
   */
  static toSummaryDTO(
    investment: Investment,
    projectName: string,
    expectedReturn?: number
  ): InvestmentSummaryDTO {
    return {
      id: investment.id,
      projectId: investment.projectId,
      projectName: projectName,
      amount: investment.amount.toNumber(),
      currency: investment.amount.getCurrency(),
      status: investment.status,
      createdAt: investment.createdAt.toISOString(),
      expectedReturn: expectedReturn,
    };
  }

  /**
   * Map raw data to Investment entity
   */
  static toEntity(data: {
    id: string;
    projectId: string;
    investor: string;
    amount: number;
    platformFee: number;
    tokenAmount: number;
    tokenSymbol: string;
    transactionHash: string;
    status: string;
    createdAt: number; // Unix timestamp
    confirmedAt?: number;
    refundedAt?: number;
  }): Investment {
    const props: InvestmentProps = {
      id: data.id,
      projectId: data.projectId,
      investor: Address.create(data.investor),
      amount: Money.fromUSDC(data.amount),
      platformFee: Money.fromUSDC(data.platformFee),
      tokenAmount: data.tokenAmount,
      tokenSymbol: data.tokenSymbol,
      transactionHash: data.transactionHash,
      status: data.status as InvestmentProps['status'],
      createdAt: new Date(data.createdAt * 1000),
      confirmedAt: data.confirmedAt ? new Date(data.confirmedAt * 1000) : undefined,
      refundedAt: data.refundedAt ? new Date(data.refundedAt * 1000) : undefined,
    };

    return Investment.create(props);
  }
}
