import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import * as multer from 'multer';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsPathwaybasedService } from '../services/jobs.pathwaybased.service';
import { CreateJobDto } from '../dto/create-job.dto';
import {
  deleteFileorFolder,
  fileOrPathExists,
  fileSizeMb,
  getFileOutput,
} from '@cubrepgwas/pgwascommon';
import { fetchLines, writePathwayBasedFile } from '@cubrepgwas/pgwascommon';
import { JobStatus } from '../models/pathwaybased.jobs.model';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../decorators/get-user.decorator';
import { UserDoc } from '../../auth/models/user.model';
import { GetJobsDto } from '../dto/getjobs.dto';

const storageOpts = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync('/tmp/summaryStats')) {
      fs.mkdirSync('/tmp/summaryStats', { recursive: true });
    }
    cb(null, '/tmp/summaryStats'); //destination
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '__' + file.originalname);
  },
});

@Controller('api/pathwaybased/noauth/jobs')
export class JobsPathwaybasedControllerNoAuth {
  constructor(private readonly jobsService: JobsPathwaybasedService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: storageOpts }))
  async create(
    @Body(ValidationPipe) createJobDto: CreateJobDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    //call service
    return await this.jobsService.create(createJobDto, file);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser() user) {
    const job = await this.jobsService.getJobByIDNoAuth(id);

    job.user = null;
    return job;
  }

  @Get('/output/:id/:file') //file is the name saved in the database
  async getOutput(
    @Param('id') id: string,
    @Param('file') file_key: string,
    @GetUser() user,
  ) {
    const job = await this.jobsService.getJobByIDNoAuth(id);
    return getFileOutput(id, file_key, job);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @GetUser() user) {
    return this.jobsService.removeJobNoAuth(id);
  }
}
