import { Global, Module } from '@nestjs/common';
import { JobsPathwaybasedService } from './services/jobs.pathwaybased.service';
import { JobsPathwaybasedController } from './controllers/jobs.pathwaybased.controller';
import { QueueModule } from '../jobqueue/queue.module';

@Global()
@Module({
  imports: [
    QueueModule,
    // AuthModule,
    // NatsModule,
  ],
  controllers: [JobsPathwaybasedController],
  providers: [JobsPathwaybasedService],
  exports: [],
})
export class JobsModule {}
