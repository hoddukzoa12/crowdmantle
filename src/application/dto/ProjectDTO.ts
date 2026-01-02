/**
 * Project Data Transfer Object - Application Layer
 * Used for data transfer between layers
 */

import { ProjectCategory, ProjectStatus } from '@/src/domain/entities';

export interface CompanyInfoDTO {
  foundedYear: number;
  employees: number;
  location: string;
  website?: string;
}

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  goal: number;
  goalCurrency: string;
  fundRaised: number;
  deadline: string; // ISO date string
  expectedReturn: number;
  category: ProjectCategory;
  status: ProjectStatus;
  investorCount: number;
  minInvestment: number;
  tokenSymbol: string;
  contractAddress: string;
  companyInfo: CompanyInfoDTO;
  image: string;
  fundingProgress: number;
  daysRemaining: number;
  isInvestable: boolean;
}

export interface ProjectSummaryDTO {
  id: string;
  name: string;
  description: string;
  goal: number;
  fundRaised: number;
  fundingProgress: number;
  daysRemaining: number;
  expectedReturn: number;
  category: ProjectCategory;
  status: ProjectStatus;
  image: string;
  investorCount: number;
}

export interface CreateProjectDTO {
  name: string;
  description: string;
  longDescription: string;
  goal: number;
  deadlineDays: number;
  expectedReturn: number;
  category: ProjectCategory;
  minInvestment: number;
  tokenSymbol: string;
  companyInfo: CompanyInfoDTO;
  image: string;
}
