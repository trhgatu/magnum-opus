import { Module } from '@nestjs/common';

import { GitHubModule } from './github/github.module';
import { WakaTimeModule } from './wakatime/wakatime.module';

@Module({
  imports: [GitHubModule, WakaTimeModule],
  // GitHubModule chỉ export GITHUB_ACTIVITY_PROVIDER — tầng activity đọc nó
  // qua module này. WakaTimeModule chưa export gì cho tới khi có adapter (PR 7c).
  exports: [GitHubModule],
})
export class IntegrationsModule {}
