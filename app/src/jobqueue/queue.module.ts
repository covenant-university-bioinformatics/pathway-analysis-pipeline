import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { createWorkers } from '../workers/annot.main';
import { PathwayBasedJobQueue } from './queue/pathwaybased.queue';
import { NatsModule } from '../nats/nats.module';
import { JobCompletedPublisher } from '../nats/publishers/job-completed-publisher';

@Module({
  imports: [NatsModule],
  providers: [PathwayBasedJobQueue],
  exports: [PathwayBasedJobQueue],
})
export class QueueModule implements OnModuleInit {
  @Inject(JobCompletedPublisher) jobCompletedPublisher: JobCompletedPublisher;
  async onModuleInit() {
    await createWorkers(this.jobCompletedPublisher);
  }
}
