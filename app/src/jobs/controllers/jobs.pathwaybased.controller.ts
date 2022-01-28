import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import * as multer from 'multer';
import * as fs from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsPathwaybasedService } from '../services/jobs.pathwaybased.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { getFileOutput } from '@cubrepgwas/pgwascommon';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../decorators/get-user.decorator';
import { GetJobsDto } from '../dto/getjobs.dto';

const storageOpts = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync('/local/datasets/temporary')) {
      fs.mkdirSync('/local/datasets/temporary', { recursive: true });
    }
    cb(null, '/local/datasets/temporary'); //destination
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '__' + file.originalname);
  },
});

@UseGuards(AuthGuard())
@Controller('api/pathwaybased/jobs')
export class JobsPathwaybasedController {
  constructor(private readonly jobsService: JobsPathwaybasedService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: storageOpts }))
  async create(
    @Body(ValidationPipe) createJobDto: CreateJobDto,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user,
  ) {
    //call service
    return await this.jobsService.create(createJobDto, file, user);
  }

  @Get()
  findAll(@Query(ValidationPipe) jobsDto: GetJobsDto, @GetUser() user) {
    return this.jobsService.findAll(jobsDto, user);
  }

  @Get('/test')
  test(@Param('id') id: string) {
    return {
      success: true,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser() user) {
    const job = await this.jobsService.getJobByID(id, user);
    // console.log('Throwing error');
    // throw Error('Testing');

    job.user = null;
    return job;
  }

  @Get('/output/:id/:file') //file is the name saved in the database
  async getOutput(
    @Param('id') id: string,
    @Param('file') file_key: string,
    @GetUser() user,
  ) {
    const job = await this.jobsService.getJobByID(id, user);
    return getFileOutput(id, file_key, job);
    // const fileExists = await fileOrPathExists(job[file_key]);
    // if (fileExists) {
    //   try {
    //     const stat = await fileSizeMb(job[file_key]);
    //     if (stat && stat > 2) {
    //       //  get first 1000 lines
    //       const lines = fetchLines(job[file_key]);
    //       return lines;
    //     } else {
    //       const file = fs.createReadStream(job[file_key]);
    //
    //       return new StreamableFile(file);
    //     }
    //   } catch (e) {
    //     console.log(e);
    //     throw new BadRequestException(e.message);
    //   }
    // } else {
    //   throw new BadRequestException(
    //     'File not available! Job probably still running or parameter not selected',
    //   );
    // }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @GetUser() user) {
    return this.jobsService.removeJob(id, user);
  }

  @Delete()
  async deleteMany(@Param('id') id: string, @GetUser() user) {
    return await this.jobsService.deleteManyJobs(user);
  }
}
