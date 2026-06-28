import { Module } from '@nestjs/common'
import { SchoolsService } from './schools.service'
import { SchoolsController } from './schools.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}