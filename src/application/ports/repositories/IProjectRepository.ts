/**
 * Project Repository Interface - Application Layer
 * Port for project data access (Dependency Inversion)
 */

import { Project, ProjectCategory, ProjectStatus } from '@/src/domain/entities';

export interface ProjectFilters {
  category?: ProjectCategory;
  status?: ProjectStatus;
  minGoal?: number;
  maxGoal?: number;
  search?: string;
}

export interface ProjectSortOptions {
  field: 'deadline' | 'fundRaised' | 'goal' | 'createdAt' | 'investorCount';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface IProjectRepository {
  /**
   * Find all projects with optional filtering
   */
  findAll(
    filters?: ProjectFilters,
    sort?: ProjectSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Project>>;

  /**
   * Find a project by its ID
   */
  findById(id: string): Promise<Project | null>;

  /**
   * Find projects by category
   */
  findByCategory(category: ProjectCategory): Promise<Project[]>;

  /**
   * Find projects by status
   */
  findByStatus(status: ProjectStatus): Promise<Project[]>;

  /**
   * Find active (investable) projects
   */
  findActive(): Promise<Project[]>;

  /**
   * Find featured projects for homepage
   */
  findFeatured(limit?: number): Promise<Project[]>;

  /**
   * Search projects by name or description
   */
  search(query: string): Promise<Project[]>;

  /**
   * Get total count of projects
   */
  count(filters?: ProjectFilters): Promise<number>;

  /**
   * Save a project (create or update)
   */
  save(project: Project): Promise<void>;

  /**
   * Update project funding status from blockchain
   */
  updateFundingStatus(id: string, fundRaised: number, investorCount: number): Promise<void>;
}
