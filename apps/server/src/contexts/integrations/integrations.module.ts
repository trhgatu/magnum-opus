import { Module } from '@nestjs/common';

import { GitHubModule } from './github/github.module';

@Module({
  imports: [GitHubModule],
})
export class IntegrationsModule {}
