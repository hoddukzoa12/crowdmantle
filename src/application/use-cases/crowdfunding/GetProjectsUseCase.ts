/**
 * Get Projects Use Case - Application Layer
 */

import { IProjectRepository, ProjectFilters, ProjectSortOptions, PaginationOptions } from '@/src/application/ports/repositories';
import { ProjectDTO } from '@/src/application/dto';
import { ProjectMapper } from '@/src/application/mappers/ProjectMapper';

export interface GetProjectsInput {
  filters?: ProjectFilters;
  sort?: ProjectSortOptions;
  pagination?: PaginationOptions;
}

export interface GetProjectsOutput {
  projects: ProjectDTO[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class GetProjectsUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(input: GetProjectsInput = {}): Promise<GetProjectsOutput> {
    const { filters, sort, pagination } = input;

    const result = await this.projectRepository.findAll(filters, sort, pagination);

    return {
      projects: result.items.map(ProjectMapper.toDTO),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrevious: result.hasPrevious,
    };
  }
}
