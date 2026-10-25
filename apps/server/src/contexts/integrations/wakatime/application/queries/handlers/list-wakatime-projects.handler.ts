import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  type ProjectRef,
  RESOURCE_USAGE_READER,
  type ResourceUsageReader,
} from '../../../../shared/application/ports/resource-usage-reader.port';
import {
  TOKEN_CIPHER,
  type TokenCipher,
} from '../../../../shared/application/ports/token-cipher.port';
import {
  WakaTimeKeyInvalidException,
  WakaTimeNotConnectedException,
} from '../../../domain/exceptions';
import {
  WAKATIME_CONNECTION_REPOSITORY,
  type WakaTimeConnectionRepository,
} from '../../../domain/ports/wakatime-connection.repository';
import {
  WAKATIME_API,
  type WakaTimeApi,
  type WakaTimeProject,
} from '../../ports/wakatime-api.port';
import { ListWakaTimeProjectsQuery } from '../list-wakatime-projects.query';

export interface WakaTimeProjectSelection {
  /** Code gần nhất trước, khớp ô tìm kiếm. */
  projects: WakaTimeProject[];
  /** Project đang dùng từng WakaTime project (theo id); không ai dùng thì vắng. */
  usedByProjects: Record<string, ProjectRef[]>;
}

@QueryHandler(ListWakaTimeProjectsQuery)
export class ListWakaTimeProjectsHandler implements IQueryHandler<
  ListWakaTimeProjectsQuery,
  Result<WakaTimeProjectSelection, DomainException>
> {
  constructor(
    @Inject(WAKATIME_API) private readonly api: WakaTimeApi,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
    @Inject(WAKATIME_CONNECTION_REPOSITORY)
    private readonly repository: WakaTimeConnectionRepository,
    @Inject(RESOURCE_USAGE_READER)
    private readonly usage: ResourceUsageReader,
  ) {}

  async execute({
    ownerId,
    search,
  }: ListWakaTimeProjectsQuery): Promise<
    Result<WakaTimeProjectSelection, DomainException>
  > {
    const connection = await this.repository.findByOwner(ownerId);
    // Chưa kết nối hoặc key đã bị thu hồi: không gọi WakaTime.
    if (!connection?.isUsable()) {
      return Result.fail(new WakaTimeNotConnectedException());
    }

    try {
      const all = await this.api.listProjects(
        this.cipher.decrypt(connection.encryptedKey),
      );
      const projects = sortByLastHeartbeat(filterByName(all, search));

      return Result.ok({
        projects,
        usedByProjects: await this.usage.usedByProjects(
          ownerId,
          'WAKATIME',
          projects.map((project) => project.id),
        ),
      });
    } catch (error) {
      if (error instanceof WakaTimeKeyInvalidException) {
        // Key bị đổi hoặc thu hồi bên WakaTime sau khi kết nối: ghi nhận để
        // client hiện "Kết nối lại". Có điều kiện: một lần kết nối lại xen
        // giữa request này không bị ghi đè.
        await this.repository.revokeIfKeyUnchanged(
          ownerId,
          connection.encryptedKey,
        );
        return Result.fail(new WakaTimeNotConnectedException());
      }
      if (error instanceof DomainException) return Result.fail(error);
      throw error;
    }
  }
}

function filterByName(
  projects: WakaTimeProject[],
  search: string | undefined,
): WakaTimeProject[] {
  const term = search?.trim().toLowerCase();
  if (!term) return projects;
  return projects.filter((project) =>
    project.name.toLowerCase().includes(term),
  );
}

/** lastHeartbeatAt giảm dần; project chưa có dữ liệu xếp cuối. */
function sortByLastHeartbeat(projects: WakaTimeProject[]): WakaTimeProject[] {
  return [...projects].sort((a, b) => {
    if (a.lastHeartbeatAt === null) return b.lastHeartbeatAt === null ? 0 : 1;
    if (b.lastHeartbeatAt === null) return -1;
    return b.lastHeartbeatAt.getTime() - a.lastHeartbeatAt.getTime();
  });
}
