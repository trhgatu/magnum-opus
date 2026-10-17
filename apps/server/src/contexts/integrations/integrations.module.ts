import { Module } from '@nestjs/common';

import { GitHubModule } from './github/github.module';

@Module({
  imports: [GitHubModule],
  // GitHubModule chỉ export GITHUB_ACTIVITY_PROVIDER — tầng activity (PR3)
  // đọc nó qua module này.
  exports: [GitHubModule],
})
export class IntegrationsModule {}
