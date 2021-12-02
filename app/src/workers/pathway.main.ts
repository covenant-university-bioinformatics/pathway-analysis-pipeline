import config from '../config/bullmq.config';
import { WorkerJob } from '../jobqueue/queue/pathwaybased.queue';
import { Job, QueueScheduler, Worker } from 'bullmq';
import {
  JobStatus,
  PathwaybasedJobsModel,
} from '../jobs/models/pathwaybased.jobs.model';
import * as path from 'path';
import {
  PathwayBasedModel,
  RunPathwayOptions,
} from '../jobs/models/pathwaybased.model';
import { JobCompletedPublisher } from '../nats/publishers/job-completed-publisher';

let scheduler;

const createScheduler = () => {
  scheduler = new QueueScheduler(config.queueName, {
    connection: config.connection,
    // maxStalledCount: 10,
    // stalledInterval: 15000,
  });
};

const processorFile = path.join(__dirname, 'annot.worker.js');

export const createWorkers = async (
  jobCompletedPublisher: JobCompletedPublisher,
) => {
  createScheduler();

  for (let i = 0; i < config.numWorkers; i++) {
    console.log('Creating worker ' + i);

    const worker = new Worker<WorkerJob>(config.queueName, processorFile, {
      connection: config.connection,
      // concurrency: config.concurrency,
      limiter: config.limiter,
    });

    worker.on('completed', async (job: Job, returnvalue: any) => {
      console.log('worker ' + i + ' completed ' + returnvalue);

      // save in mongo database
      // job is complete
      const parameters = await PathwayBasedModel.findOne({
        job: job.data.jobId,
      }).exec();

      const scores_filename =
        parameters.chr === 'all'
          ? `${parameters.filename_prefix}.${parameters.gene_scoring}.genescores_filtered.txt`
          : `${parameters.filename_prefix}.${parameters.gene_scoring}.genescores.chr${parameters.chr}_filtered.txt`;

      const pathway_filename =
        parameters.run_pathway === RunPathwayOptions.ON
          ? parameters.chr === 'all'
            ? `${parameters.filename_prefix}.PathwaySet--${parameters.gene_set_file}--${parameters.gene_scoring}_filtered.txt`
            : `${parameters.filename_prefix}.PathwaySet--${parameters.gene_set_file}--${parameters.gene_scoring}.chr${parameters.chr}_filtered.txt`
          : '';
      const fusion_filename =
        parameters.run_pathway === RunPathwayOptions.ON
          ? parameters.chr === 'all'
            ? `${parameters.filename_prefix}.${parameters.gene_scoring}.fusion.genescores_filtered.txt`
            : `${parameters.filename_prefix}.${parameters.gene_scoring}.fusion.genescores.chr${parameters.chr}_filtered.txt`
          : '';

      const pathToOutputDir = `/pv/analysis/${job.data.jobUID}/pathwaybased/output`;

      //update db with result files
      const finishedJob = await PathwaybasedJobsModel.findByIdAndUpdate(
        job.data.jobId,
        {
          status: JobStatus.COMPLETED,
          geneScoresFile: `${pathToOutputDir}/${scores_filename}`,
          ...(parameters.run_pathway === RunPathwayOptions.ON && {
            pathwaySetFile: `${pathToOutputDir}/${pathway_filename}`,
          }),
          fusionGenesFile: `${pathToOutputDir}/${fusion_filename}`,
          completionTime: new Date(),
        },
        { new: true },
      );

      //send email incase its a long job
      if (finishedJob.longJob) {
        await jobCompletedPublisher.publish({
          type: 'jobStatus',
          recipient: {
            email: job.data.email,
          },
          payload: {
            comments: `${job.data.jobName} has completed successfully`,
            jobID: job.data.jobId,
            jobName: job.data.jobName,
            status: finishedJob.status,
            username: job.data.username,
            link: `tools/pathwaybased/result_view/${finishedJob._id}`,
          },
        });
      }
    });

    worker.on('failed', async (job: Job) => {
      console.log('worker ' + i + ' failed ' + job.failedReason);
      //update job in database as failed
      //save in mongo database
      const finishedJob = await PathwaybasedJobsModel.findByIdAndUpdate(
        job.data.jobId,
        {
          status: JobStatus.FAILED,
          failed_reason: job.failedReason,
          completionTime: new Date(),
        },
        { new: true },
      );

      if (finishedJob.longJob) {
        await jobCompletedPublisher.publish({
          type: 'jobStatus',
          recipient: {
            email: job.data.email,
          },
          payload: {
            comments: `${job.data.jobName} has failed to complete`,
            jobID: job.data.jobId,
            jobName: job.data.jobName,
            status: finishedJob.status,
            username: job.data.username,
            link: `tools/pathwaybased/result_view/${finishedJob._id}`,
          },
        });
      }
    });

    // worker.on('close', () => {
    //   console.log('worker ' + i + ' closed');
    // });

    process.on('SIGINT', () => {
      worker.close();
      console.log('worker ' + i + ' closed');
    });

    process.on('SIGTERM', () => {
      worker.close();
      console.log('worker ' + i + ' closed');
    });

    process.on('SIGBREAK', () => {
      worker.close();
      console.log('worker ' + i + ' closed');
    });

    console.log('Worker ' + i + ' created');
  }
};
