import { Global, Module } from '@nestjs/common';
import { JobsPathwaybasedService } from './services/jobs.pathwaybased.service';
import { JobsPathwaybasedController } from './controllers/jobs.pathwaybased.controller';
import { QueueModule } from '../jobqueue/queue.module';
import { JobsPathwaybasedControllerNoAuth } from './controllers/jobs.pathwaybased.noauth.controller';

@Global()
@Module({
  imports: [
    QueueModule,
    // AuthModule,
    // NatsModule,
  ],
  controllers: [JobsPathwaybasedController, JobsPathwaybasedControllerNoAuth],
  providers: [JobsPathwaybasedService],
  exports: [],
})
export class JobsModule {}
