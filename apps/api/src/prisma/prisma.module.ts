import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global() // Disponible partout sans réimporter
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}