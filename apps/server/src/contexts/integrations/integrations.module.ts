import { Module } from '@nestjs/common';

import { GitHubModule } from './github/github.module';
import { WakaTimeModule } from './wakatime/wakatime.module';

@Module({
  imports: [GitHubModule, WakaTimeModule],
  // Mỗi module chỉ export provider hoạt động của nó — tầng activity đọc
  // chúng qua module này.

  exports: [GitHubModule, WakaTimeModule],
})
export class IntegrationsModule {}
