/**
 * Get Project By ID Use Case - Application Layer
 */

import { IProjectRepository } from '@/src/application/ports/repositories';
import { ProjectDTO } from '@/src/application/dto';
import { ProjectMapper } from '@/src/application/mappers/ProjectMapper';
import { ProjectNotFoundError } from '@/src/domain/errors';

export interface GetProjectByIdInput {
  projectId: string;
}

export interface GetProjectByIdOutput {
  project: ProjectDTO;
}

export class GetProjectByIdUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(input: GetProjectByIdInput): Promise<GetProjectByIdOutput> {
    const project = await this.projectRepository.findById(input.projectId);

    if (!project) {
      throw new ProjectNotFoundError(input.projectId);
    }

    return {
      project: ProjectMapper.toDTO(project),
    };
  }
}
