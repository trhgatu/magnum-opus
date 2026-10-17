import { Module } from '@nestjs/common';

import { GitHubModule } from './github/github.module';

@Module({
  imports: [GitHubModule],
  // Tầng activity (PR3) đọc GITHUB_ACTIVITY_PROVIDER qua module này.
  exports: [GitHubModule],
})
export class IntegrationsModule {}
