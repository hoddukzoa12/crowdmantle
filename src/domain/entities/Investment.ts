/**
 * Investment Entity - Domain Layer
 * Represents an investment made by a user in a crowdfunding project
 */

import { Money } from '../value-objects/Money';
import { Address } from '../value-objects/Address';

export type InvestmentStatus = 'pending' | 'confirmed' | 'refunded' | 'failed';

export interface InvestmentProps {
  id: string;
  projectId: string;
  investor: Address;
  amount: Money;
  platformFee: Money;
  tokenAmount: number;
  tokenSymbol: string;
  transactionHash: string;
  status: InvestmentStatus;
  createdAt: Date;
  confirmedAt?: Date;
  refundedAt?: Date;
}

export class Investment {
  private constructor(private readonly props: InvestmentProps) {}

  static create(props: InvestmentProps): Investment {
    return new Investment(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get projectId(): string {
    return this.props.projectId;
  }

  get investor(): Address {
    return this.props.investor;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get platformFee(): Money {
    return this.props.platformFee;
  }

  get tokenAmount(): number {
    return this.props.tokenAmount;
  }

  get tokenSymbol(): string {
    return this.props.tokenSymbol;
  }

  get transactionHash(): string {
    return this.props.transactionHash;
  }

  get status(): InvestmentStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  get refundedAt(): Date | undefined {
    return this.props.refundedAt;
  }

  // Computed properties
  get totalAmount(): Money {
    return this.props.amount.add(this.props.platformFee);
  }

  get netAmount(): Money {
    return this.props.amount;
  }

  get isPending(): boolean {
    return this.props.status === 'pending';
  }

  get isConfirmed(): boolean {
    return this.props.status === 'confirmed';
  }

  get isRefunded(): boolean {
    return this.props.status === 'refunded';
  }

  get isFailed(): boolean {
    return this.props.status === 'failed';
  }

  // Business logic
  canRefund(): boolean {
    return this.props.status === 'confirmed';
  }

  isOwnedBy(address: Address): boolean {
    return this.props.investor.equals(address);
  }

  // Display helpers
  getStatusLabel(): string {
    const labels: Record<InvestmentStatus, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      refunded: 'Refunded',
      failed: 'Failed',
    };
    return labels[this.props.status];
  }

  getExplorerUrl(baseUrl: string): string {
    return `${baseUrl}/tx/${this.props.transactionHash}`;
  }
}
