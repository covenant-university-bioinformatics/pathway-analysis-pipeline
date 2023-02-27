import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
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
import {
  writePathwayBasedFile,
  findAllJobs,
  removeUserJob,
  removeManyUserJobs,
  fileOrPathExists,
  fileSizeMb,
} from '@cubrepgwas/pgwascommon';

//production
const testPath = '/local/datasets/pgwas_test_files/pascal/UK_pval_0.05.txt';
//development
// const testPath = '/local/datasets/data/pascal/UK_pval_0.05.txt';

@Injectable()
export class JobsPathwaybasedService {
  constructor(
    @Inject(PathwayBasedJobQueue)
    private jobQueue: PathwayBasedJobQueue,
  ) {}

  async create(
    createJobDto: CreateJobDto,
    file: Express.Multer.File,
    user?: UserDoc,
  ) {
    if (createJobDto.useTest === 'false') {
      if (!file) {
        throw new BadRequestException('Please upload a file');
      }

      // if (file.mimetype !== 'text/plain') {
      //   throw new BadRequestException('Please upload a text file');
      // }
    }

    if (!user && !createJobDto.email) {
      throw new BadRequestException(
        'Job cannot be null, check job parameters, and try again',
      );
    }

    if (user && createJobDto.email) {
      throw new BadRequestException('User signed in, no need for email');
    }

    const numberColumns = ['marker_name', 'p_value'];

    //change number columns to integers
    const columns = numberColumns.map((column) => {
      return parseInt(createJobDto[column], 10);
    });

    //check if there are wrong column numbers
    const wrongColumn = columns.some((value) => value < 1 || value > 15);

    if (wrongColumn) {
      throw new BadRequestException('Column numbers must be between 0 and 15');
    }
    //check if there are duplicate columns
    const duplicates = new Set(columns).size !== columns.length;

    if (duplicates) {
      throw new BadRequestException('Column numbers must not have duplicates');
    }

    //create jobUID
    const jobUID = uuidv4();

    //create folder with job uid and create input folder in job uid folder
    const value = await fileOrPathExists(`/pv/analysis/${jobUID}`);

    if (!value) {
      fs.mkdirSync(`/pv/analysis/${jobUID}/input`, { recursive: true });
    } else {
      throw new InternalServerErrorException();
    }

    // console.log(createJobDto);
    console.log(jobUID);

    const session = await PathwaybasedJobsModel.startSession();
    const sessionTest = await PathwayBasedModel.startSession();
    session.startTransaction();
    sessionTest.startTransaction();

    try {
      const opts = { session };
      const optsTest = { session: sessionTest };

      const filepath = createJobDto.useTest === 'true' ? testPath : file.path;

      const fileSize = await fileSizeMb(filepath);
      const longJob = fileSize > 0.5;

      //save job parameters, folder path, filename in database
      let newJob;

      if (user) {
        newJob = await PathwaybasedJobsModel.build({
          job_name: createJobDto.job_name,
          jobUID,
          inputFile: filepath,
          status: JobStatus.QUEUED,
          user: user.id,
          longJob,
        });
      }

      if (createJobDto.email) {
        newJob = await PathwaybasedJobsModel.build({
          job_name: createJobDto.job_name,
          jobUID,
          inputFile: filepath,
          status: JobStatus.QUEUED,
          email: createJobDto.email,
          longJob,
        });
      }

      if (!newJob) {
        throw new BadRequestException(
          'Job cannot be null, check job parameters',
        );
      }

      let filename = filepath.replace(/^.*[\\\/]/, '');
      const prefix = filename.replace(/\.[^/.]+$/, '');
      //let the models be created per specific analysis
      const genebased = await PathwayBasedModel.build({
        ...createJobDto,
        filename_prefix: prefix,
        job: newJob.id,
      });

      await genebased.save(optsTest);
      await newJob.save(opts);

      //add job to queue
      if (user) {
        await this.jobQueue.addJob({
          jobId: newJob.id,
          jobName: newJob.job_name,
          jobUID: newJob.jobUID,
          username: user.username,
          email: user.email,
          noAuth: false,
        });
      }

      if (createJobDto.email) {
        await this.jobQueue.addJob({
          jobId: newJob.id,
          jobName: newJob.job_name,
          jobUID: newJob.jobUID,
          username: 'User',
          email: createJobDto.email,
          noAuth: true,
        });
      }

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
    return await findAllJobs(getJobsDto, user, PathwaybasedJobsModel);
    // await sleep(1000);
    // const sortVariable = getJobsDto.sort ? getJobsDto.sort : 'createdAt';
    // const limit = getJobsDto.limit ? parseInt(getJobsDto.limit, 10) : 2;
    // const page =
    //   getJobsDto.page || getJobsDto.page === '0'
    //     ? parseInt(getJobsDto.page, 10)
    //     : 1;
    // const startIndex = (page - 1) * limit;
    // const endIndex = page * limit;
    //
    // const result = await PathwaybasedJobsModel.aggregate([
    //   { $match: { user: user._id } },
    //   { $sort: { [sortVariable]: -1 } },
    //   {
    //     $project: {
    //       _id: 1,
    //       status: 1,
    //       job_name: 1,
    //       createdAt: 1,
    //     },
    //   },
    //   {
    //     $facet: {
    //       count: [{ $group: { _id: null, count: { $sum: 1 } } }],
    //       sample: [{ $skip: startIndex }, { $limit: limit }],
    //     },
    //   },
    //   { $unwind: '$count' },
    //   {
    //     $project: {
    //       count: '$count.count',
    //       data: '$sample',
    //     },
    //   },
    // ]);
    //
    // if (result[0]) {
    //   const { count, data } = result[0];
    //
    //   const pagination: any = {};
    //
    //   if (endIndex < count) {
    //     pagination.next = { page: page + 1, limit };
    //   }
    //
    //   if (startIndex > 0) {
    //     pagination.prev = {
    //       page: page - 1,
    //       limit,
    //     };
    //   }
    //   //
    //   return {
    //     success: true,
    //     count: data.length,
    //     total: count,
    //     pagination,
    //     data,
    //   };
    // }
    // return {
    //   success: true,
    //   count: 0,
    //   total: 0,
    //   data: [],
    // };
  }

  // async findOne(id: string) {
  //   return await this.jobsModel.findById(id).exec();
  // }

  async getJobByID(id: string, user: UserDoc) {
    const job = await PathwaybasedJobsModel.findById(id)
      .populate('pathwaybased_params')
      .populate('user')
      .exec();

    if (!job) {
      throw new NotFoundException();
    }

    if (job?.user?.username !== user.username) {
      throw new ForbiddenException('Access not allowed');
    }

    return job;
  }

  async getJobByIDNoAuth(id: string) {
    const job = await PathwaybasedJobsModel.findById(id)
      .populate('pathwaybased_params')
      .populate('user')
      .exec();

    if (!job) {
      throw new NotFoundException();
    }

    if (job?.user?.username) {
      throw new ForbiddenException('Access not allowed');
    }

    return job;
  }

  async removeJob(id: string, user: UserDoc) {
    const job = await this.getJobByID(id, user);

    return await removeUserJob(id, job);
  }

  async removeJobNoAuth(id: string) {
    const job = await this.getJobByIDNoAuth(id);

    return await removeUserJob(id, job);
  }

  async deleteManyJobs(user: UserDoc) {
    return await removeManyUserJobs(user, PathwaybasedJobsModel);

    // const jobs = await PathwaybasedJobsModel.find({ user: user._id }).exec();
    //
    // if (jobs.length > 0) {
    //   //  check if job is running
    //   const jobRunning = jobs.some(
    //     (job) =>
    //       job.status === JobStatus.RUNNING || job.status === JobStatus.QUEUED,
    //   );
    //
    //   if (jobRunning) {
    //     throw new BadRequestException(
    //       'Some Jobs are still running, wait for it to complete',
    //     );
    //   }
    //
    //   const deletedJobs = jobs.map(async (job) => {
    //     // if job is not running, delete in database
    //     await job.remove();
    //
    //     //delete all files in jobUID folder
    //     await deleteFileorFolder(`/pv/analysis/${job.jobUID}`);
    //   });
    //
    //   try {
    //     await Promise.all(deletedJobs);
    //     return { success: true };
    //   } catch (e) {
    //     console.log(e);
    //     throw new InternalServerErrorException('Please try again');
    //   }
    // }
    //
    // return { success: true };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
