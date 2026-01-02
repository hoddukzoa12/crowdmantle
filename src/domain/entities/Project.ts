/**
 * Project Entity - Domain Layer
 * Represents a crowdfunding project in the CrowdMantle platform
 */

import { Money } from '../value-objects/Money';
import { Address } from '../value-objects/Address';

export type ProjectCategory =
  | 'tech'
  | 'fintech'
  | 'healthcare'
  | 'ecommerce'
  | 'entertainment'
  | 'real-estate'
  | 'energy';

export type ProjectStatus = 'active' | 'funded' | 'expired' | 'refunding';

export interface CompanyInfo {
  foundedYear: number;
  employees: number;
  location: string;
  website?: string;
}

export interface ProjectProps {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  goal: Money;
  fundRaised: Money;
  deadline: Date;
  expectedReturn: number;
  category: ProjectCategory;
  status: ProjectStatus;
  investorCount: number;
  minInvestment: Money;
  tokenSymbol: string;
  contractAddress: Address;
  companyInfo: CompanyInfo;
  image: string;
}

export class Project {
  private constructor(private readonly props: ProjectProps) {}

  static create(props: ProjectProps): Project {
    return new Project(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get longDescription(): string {
    return this.props.longDescription;
  }

  get goal(): Money {
    return this.props.goal;
  }

  get fundRaised(): Money {
    return this.props.fundRaised;
  }

  get deadline(): Date {
    return this.props.deadline;
  }

  get expectedReturn(): number {
    return this.props.expectedReturn;
  }

  get category(): ProjectCategory {
    return this.props.category;
  }

  get status(): ProjectStatus {
    return this.props.status;
  }

  get investorCount(): number {
    return this.props.investorCount;
  }

  get minInvestment(): Money {
    return this.props.minInvestment;
  }

  get tokenSymbol(): string {
    return this.props.tokenSymbol;
  }

  get contractAddress(): Address {
    return this.props.contractAddress;
  }

  get companyInfo(): CompanyInfo {
    return this.props.companyInfo;
  }

  get image(): string {
    return this.props.image;
  }

  // Computed properties
  get fundingProgress(): number {
    const goalAmount = this.props.goal.toNumber();
    if (goalAmount === 0) return 0;
    return Math.min(100, (this.props.fundRaised.toNumber() / goalAmount) * 100);
  }

  get daysRemaining(): number {
    const now = new Date();
    const diff = this.props.deadline.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get isExpired(): boolean {
    return new Date() >= this.props.deadline;
  }

  get isFunded(): boolean {
    return this.props.fundRaised.gte(this.props.goal);
  }

  // Business logic
  isInvestable(): boolean {
    return (
      this.props.status === 'active' &&
      !this.isExpired &&
      !this.isFunded
    );
  }

  canRefund(): boolean {
    return (
      this.props.status === 'refunding' ||
      (this.isExpired && !this.isFunded)
    );
  }

  canInvestAmount(amount: Money): boolean {
    return amount.gte(this.props.minInvestment);
  }
}
