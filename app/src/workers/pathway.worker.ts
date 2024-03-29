import { SandboxedJob } from 'bullmq';
import * as fs from 'fs';
import {
  JobStatus,
  PathwaybasedJobsModel,
} from '../jobs/models/pathwaybased.jobs.model';
import {
  PathwayBasedDoc,
  PathwayBasedModel,
  RunPathwayOptions,
} from '../jobs/models/pathwaybased.model';
import { spawnSync } from 'child_process';
import connectDB, { closeDB } from '../mongoose';

import {
  fileOrPathExists,
  writePathwayBasedFile,
} from '@cubrepgwas/pgwascommon';
import { deleteFileorFolder } from '../utils/utilityfunctions';
import * as extract from "extract-zip";
import * as globby from "globby";

function sleep(ms) {
  console.log('sleeping');
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJobParameters(parameters: PathwayBasedDoc) {
  return [
    String(parameters.population),
    String(parameters.run_pathway),
    String(parameters.chr),
    String(parameters.gene_set_file),
    String(parameters.pvalue_cutoff),
    String(parameters.up_window),
    String(parameters.down_window),
    String(parameters.max_snp),
    String(parameters.gene_scoring),
    String(parameters.merge_distance),
    String(parameters.maf_cutoff),
  ];
}

export default async (job: SandboxedJob) => {
  //executed for each job
  console.log(
    'Worker ' +
      ' processing job ' +
      JSON.stringify(job.data.jobId) +
      ' Job name: ' +
      JSON.stringify(job.data.jobName),
  );

  await connectDB();
  await sleep(2000);

  //fetch job parameters from database
  let parameters = await PathwayBasedModel.findOne({
    job: job.data.jobId,
  }).exec();
  const jobParams = await PathwaybasedJobsModel.findById(job.data.jobId).exec();

  //--1
  let fileInput = jobParams.inputFile;

  //check if file is a zipped file
  if(/[^.]+$/.exec(jobParams.inputFile)[0] === 'zip'){
    fs.mkdirSync(`/pv/analysis/${jobParams.jobUID}/zip`, { recursive: true });
    await extract(jobParams.inputFile, {dir: `/pv/analysis/${jobParams.jobUID}/zip/`});
    const paths = await globby(`/pv/analysis/${jobParams.jobUID}/zip/*.*`);
    if (paths.length === 0){
      throw new Error('Zip had no files')
    }
    if (paths.length > 1){
      throw new Error('Zip had too many files')
    }
    fileInput = paths[0]
  }

  //create input file and folder
  let filename;

  //--2
  //extract file name
  const name = fileInput.split(/(\\|\/)/g).pop();

  if (parameters.useTest === false) {
    filename = `/pv/analysis/${jobParams.jobUID}/input/${name}`;
  } else {
    filename = `/pv/analysis/${jobParams.jobUID}/input/test.txt`;
  }

  //write the exact columns needed by the analysis
  //--3
  writePathwayBasedFile(fileInput, filename, {
    marker_name: parameters.marker_name - 1,
    p: parameters.p_value - 1,
  });

  if (parameters.useTest === false) {
    deleteFileorFolder(jobParams.inputFile).then(() => {
      console.log('deleted');
    });
  }

  //--4
  if(/[^.]+$/.exec(jobParams.inputFile)[0] === 'zip'){
    deleteFileorFolder(fileInput).then(() => {
      console.log('deleted');
    });
  }

  //update new file prefix
  let fname = filename.replace(/^.*[\\\/]/, '');
  const prefix = fname.replace(/\.[^/.]+$/, '');

  parameters = await PathwayBasedModel.findOneAndUpdate(
    { job: job.data.jobId },
    { filename_prefix: prefix },
    { new: true },
  ).exec();

  //assemble job parameters
  const pathToInputFile = filename;
  const pathToOutputDir = `/pv/analysis/${job.data.jobUID}/pathwaybased/output`;
  const jobParameters = getJobParameters(parameters);
  jobParameters.unshift(pathToInputFile, pathToOutputDir);
  // console.log(jobParameters);
  console.log(jobParameters);
  //make output directory
  fs.mkdirSync(pathToOutputDir, { recursive: true });

  // save in mongo database
  await PathwaybasedJobsModel.findByIdAndUpdate(
    job.data.jobId,
    {
      status: JobStatus.RUNNING,
      inputFile: filename,
    },
    { new: true },
  );
  await sleep(3000);
  //spawn process
  const jobSpawn = spawnSync(
    // './pipeline_scripts/pascal.sh &>/dev/null',
    './pipeline_scripts/pascal.sh',
    jobParameters,
    { maxBuffer: 1024 * 1024 * 10 },
  );

  console.log('Spawn command log');
  console.log(jobSpawn?.stdout?.toString());
  console.log('=====================================');
  console.log('Spawn error log');
  const error_msg = jobSpawn?.stderr?.toString();
  console.log(error_msg);

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

  const genes_scores = await fileOrPathExists(
    `${pathToOutputDir}/${scores_filename}`,
  );

  let fusion_file = true;
  let pathways = true;

  if (parameters.run_pathway === RunPathwayOptions.ON) {
    pathways = false;
    fusion_file = false;
    pathways = await fileOrPathExists(`${pathToOutputDir}/${pathway_filename}`);
    fusion_file = await fileOrPathExists(
      `${pathToOutputDir}/${fusion_filename}`,
    );
  }
  console.log(genes_scores, fusion_file, pathways);

  closeDB();

  if (genes_scores && pathways) {
    console.log(`${job?.data?.jobName} spawn done!`);
    return true;
  } else {
    throw new Error(
      'Job failed to successfully complete, please check your input parameters and try again',
    );
    // throw new Error('Job failed to successfully complete');
  }

  return true;
};
