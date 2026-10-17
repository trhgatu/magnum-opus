import { Module } from '@nestjs/common';

import { ProjectModule } from './project/project.module';
import { ProjectActivityModule } from './project-activity/project-activity.module';

@Module({
  imports: [ProjectModule, ProjectActivityModule],
})
export class CrucibleModule {}
