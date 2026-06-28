import { Module } from '@nestjs/common'
import { ChildrenService } from './children.service'
import { ChildrenController } from './children.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}