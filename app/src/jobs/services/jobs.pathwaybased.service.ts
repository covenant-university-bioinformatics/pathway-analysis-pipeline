import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateJobDto } from '../dto/create-job.dto';
import {
  PathwayBasedJobsDoc,
  PathwaybasedJobsModel,
  JobStatus,
} from '../models/pathwaybased.jobs.model';
import { PathwayBasedModel } from '../models/pathwaybased.model';
import { PathwayBasedJobQueue } from '../../jobqueue/queue/pathwaybased.queue';
import { UserDoc } from '../../auth/models/user.model';
import { deleteFileorFolder } from '../../utils/utilityfunctions';
import { GetJobsDto } from '../dto/getjobs.dto';

@Injectable()
export class JobsPathwaybasedService {
  constructor(
    @Inject(PathwayBasedJobQueue)
    private jobQueue: PathwayBasedJobQueue,
  ) {}

  async create(
    createJobDto: CreateJobDto,
    jobUID: string,
    filename: string,
    user: UserDoc,
    totalLines: number,
  ) {
    const session = await PathwaybasedJobsModel.startSession();
    const sessionTest = await PathwayBasedModel.startSession();
    session.startTransaction();
    sessionTest.startTransaction();

    try {
      // console.log('DTO: ', createJobDto);
      const opts = { session };
      const optsTest = { session: sessionTest };
      const longJob = totalLines > 50000;

      //save job parameters, folder path, filename in database
      const newJob = await PathwaybasedJobsModel.build({
        job_name: createJobDto.job_name,
        jobUID,
        inputFile: filename,
        status: JobStatus.QUEUED,
        user: user.id,
        longJob,
      });

      //let the models be created per specific analysis
      const genebased = await PathwayBasedModel.build({
        ...createJobDto,
        filename_prefix: filename.split('/')[5].split('.')[0],
        job: newJob.id,
      });

      await genebased.save(optsTest);
      await newJob.save(opts);

      //add job to queue
      await this.jobQueue.addJob({
        jobId: newJob.id,
        jobName: newJob.job_name,
        jobUID: newJob.jobUID,
        username: user.username,
        email: user.email,
      });

      await session.commitTransaction();
      await sessionTest.commitTransaction();
      return {
        success: true,
        jobId: newJob.id,
      };
    } catch (e) {
      if (e.code === 11000) {
        throw new ConflictException('Duplicate job name not allowed');
      }
      await session.abortTransaction();
      await sessionTest.abortTransaction();
      deleteFileorFolder(`/pv/analysis/${jobUID}`).then(() => {
        // console.log('deleted');
      });
      throw new BadRequestException(e.message);
    } finally {
      session.endSession();
      sessionTest.endSession();
    }
  }
  async findAll(getJobsDto: GetJobsDto, user: UserDoc) {
    // await sleep(1000);
    const sortVariable = getJobsDto.sort ? getJobsDto.sort : 'createdAt';
    const limit = getJobsDto.limit ? parseInt(getJobsDto.limit, 10) : 2;
    const page =
      getJobsDto.page || getJobsDto.page === '0'
        ? parseInt(getJobsDto.page, 10)
        : 1;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const result = await PathwaybasedJobsModel.aggregate([
      { $match: { user: user._id } },
      { $sort: { [sortVariable]: -1 } },
      {
        $project: {
          _id: 1,
          status: 1,
          job_name: 1,
          createdAt: 1,
        },
      },
      {
        $facet: {
          count: [{ $group: { _id: null, count: { $sum: 1 } } }],
          sample: [{ $skip: startIndex }, { $limit: limit }],
        },
      },
      { $unwind: '$count' },
      {
        $project: {
          count: '$count.count',
          data: '$sample',
        },
      },
    ]);

    if (result[0]) {
      const { count, data } = result[0];

      const pagination: any = {};

      if (endIndex < count) {
        pagination.next = { page: page + 1, limit };
      }

      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit,
        };
      }
      //
      return {
        success: true,
        count: data.length,
        total: count,
        pagination,
        data,
      };
    }
    return {
      success: true,
      count: 0,
      total: 0,
      data: [],
    };
  }

  // async findOne(id: string) {
  //   return await this.jobsModel.findById(id).exec();
  // }

  async getJobByID(id: string) {
    return await PathwaybasedJobsModel.findById(id)
      .populate('pathwaybased_params')
      .populate('user')
      .exec();
  }

  async deleteManyJobs(user: UserDoc): Promise<PathwayBasedJobsDoc[]> {
    return await PathwaybasedJobsModel.find({ user: user._id }).exec();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
