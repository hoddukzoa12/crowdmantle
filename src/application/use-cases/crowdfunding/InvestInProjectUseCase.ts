/**
 * Invest In Project Use Case - Application Layer
 */

import { IProjectRepository, IInvestmentRepository } from '@/src/application/ports/repositories';
import { IBlockchainService } from '@/src/application/ports/services';
import { InvestmentDTO } from '@/src/application/dto';
import { Investment } from '@/src/domain/entities';
import { Money, Address } from '@/src/domain/value-objects';
import { InvestmentRulesService } from '@/src/domain/services';
import { InvestmentMapper } from '@/src/application/mappers/InvestmentMapper';
import {
  ProjectNotFoundError,
  ProjectNotInvestableError,
  InvestmentLimitExceededError,
  TransactionFailedError,
} from '@/src/domain/errors';

export interface InvestInProjectInput {
  projectId: string;
  investorAddress: string;
  amount: number;
}

export interface InvestInProjectOutput {
  success: boolean;
  investment?: InvestmentDTO;
  transactionHash?: string;
  error?: string;
  warnings?: string[];
}

export class InvestInProjectUseCase {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly investmentRepository: IInvestmentRepository,
    private readonly blockchainService: IBlockchainService
  ) {}

  async execute(input: InvestInProjectInput): Promise<InvestInProjectOutput> {
    const { projectId, investorAddress, amount } = input;

    // 1. Get project
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    // 2. Check if project is investable
    if (!project.isInvestable()) {
      throw new ProjectNotInvestableError(projectId, 'Project is not accepting investments');
    }

    // 3. Validate investment amount
    const investmentAmount = Money.fromUSDC(amount);

    if (!project.canInvestAmount(investmentAmount)) {
      throw new ProjectNotInvestableError(
        projectId,
        `Minimum investment is ${project.minInvestment.toDisplay()}`
      );
    }

    // 4. Check annual investment limit
    const investorAddr = Address.create(investorAddress);
    const annualTotal = await this.investmentRepository.getAnnualTotalByInvestor(investorAddr);
    const previousTotal = Money.fromUSDC(annualTotal);

    const eligibility = InvestmentRulesService.checkInvestmentEligibility(
      investmentAmount,
      previousTotal,
      project.minInvestment
    );

    if (!eligibility.eligible) {
      throw new InvestmentLimitExceededError(
        eligibility.remainingLimit.toDisplay(),
        investmentAmount.toDisplay()
      );
    }

    // 5. Calculate fee
    const platformFee = InvestmentRulesService.calculatePlatformFee(investmentAmount);
    const totalAmount = investmentAmount.add(platformFee);

    // 6. Execute blockchain transaction
    const txResult = await this.blockchainService.invest(
      project.contractAddress.toString(),
      totalAmount.toWei()
    );

    if (!txResult.success) {
      throw new TransactionFailedError('invest', txResult.error);
    }

    // 7. Create investment record
    const investment = Investment.create({
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      investor: investorAddr,
      amount: investmentAmount,
      platformFee,
      tokenAmount: amount, // 1:1 for simplicity
      tokenSymbol: project.tokenSymbol,
      transactionHash: txResult.transactionHash,
      status: 'pending',
      createdAt: new Date(),
    });

    await this.investmentRepository.save(investment);

    return {
      success: true,
      investment: InvestmentMapper.toDTO(investment),
      transactionHash: txResult.transactionHash,
      warnings: eligibility.warnings,
    };
  }
}
