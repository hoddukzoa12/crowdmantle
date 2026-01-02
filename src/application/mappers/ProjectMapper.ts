/**
 * Project Mapper - Application Layer
 * Maps between Project entity and ProjectDTO
 */

import { Project, ProjectProps } from '@/src/domain/entities';
import { Money, Address } from '@/src/domain/value-objects';
import { ProjectDTO, ProjectSummaryDTO } from '@/src/application/dto';

export class ProjectMapper {
  /**
   * Map Project entity to ProjectDTO
   */
  static toDTO(project: Project): ProjectDTO {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      longDescription: project.longDescription,
      goal: project.goal.toNumber(),
      goalCurrency: project.goal.getCurrency(),
      fundRaised: project.fundRaised.toNumber(),
      deadline: project.deadline.toISOString(),
      expectedReturn: project.expectedReturn,
      category: project.category,
      status: project.status,
      investorCount: project.investorCount,
      minInvestment: project.minInvestment.toNumber(),
      tokenSymbol: project.tokenSymbol,
      contractAddress: project.contractAddress.toString(),
      companyInfo: project.companyInfo,
      image: project.image,
      fundingProgress: project.fundingProgress,
      daysRemaining: project.daysRemaining,
      isInvestable: project.isInvestable(),
    };
  }

  /**
   * Map Project entity to ProjectSummaryDTO
   */
  static toSummaryDTO(project: Project): ProjectSummaryDTO {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      goal: project.goal.toNumber(),
      fundRaised: project.fundRaised.toNumber(),
      fundingProgress: project.fundingProgress,
      daysRemaining: project.daysRemaining,
      expectedReturn: project.expectedReturn,
      category: project.category,
      status: project.status,
      image: project.image,
      investorCount: project.investorCount,
    };
  }

  /**
   * Map raw data to Project entity
   */
  static toEntity(data: {
    id: string;
    name: string;
    description: string;
    longDescription: string;
    goal: number;
    fundRaised: number;
    deadline: number; // Unix timestamp
    expectedReturn: number;
    category: string;
    status: string;
    investorCount: number;
    minInvestment: number;
    tokenSymbol: string;
    contractAddress: string;
    companyInfo: {
      foundedYear: number;
      employees: number;
      location: string;
      website?: string;
    };
    image: string;
  }): Project {
    const props: ProjectProps = {
      id: data.id,
      name: data.name,
      description: data.description,
      longDescription: data.longDescription,
      goal: Money.fromUSDC(data.goal),
      fundRaised: Money.fromUSDC(data.fundRaised),
      deadline: new Date(data.deadline * 1000),
      expectedReturn: data.expectedReturn,
      category: data.category as ProjectProps['category'],
      status: data.status as ProjectProps['status'],
      investorCount: data.investorCount,
      minInvestment: Money.fromUSDC(data.minInvestment),
      tokenSymbol: data.tokenSymbol,
      contractAddress: Address.create(data.contractAddress),
      companyInfo: data.companyInfo,
      image: data.image,
    };

    return Project.create(props);
  }
}
