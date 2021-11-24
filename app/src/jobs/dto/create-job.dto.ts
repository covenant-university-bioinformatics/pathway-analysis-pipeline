import {
  IsNumberString,
  IsString,
  MaxLength,
  MinLength,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import {
  Populations,
  RunPathwayOptions,
  GeneScoringOptions,
  GeneSetFileOptions,
} from '../models/pathwaybased.model';

export class CreateJobDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  job_name: string;

  @IsNumberString()
  marker_name: string;

  @IsNumberString()
  p_value: string;

  @IsNotEmpty()
  @IsEnum(Populations)
  population: Populations;

  @IsNotEmpty()
  @IsEnum(RunPathwayOptions)
  run_pathway: RunPathwayOptions;

  @IsString()
  chr: string;

  @IsNotEmpty()
  @IsEnum(GeneSetFileOptions)
  gene_set_file: GeneSetFileOptions;

  @IsNumberString()
  pvalue_cutoff: string;

  @IsNumberString()
  up_window: string;

  @IsNumberString()
  down_window: string;

  @IsNumberString()
  max_snp: string;

  @IsNotEmpty()
  @IsEnum(GeneScoringOptions)
  gene_scoring: GeneScoringOptions;

  @IsNumberString()
  merge_distance: string;

  @IsNumberString()
  maf_cutoff: string;
}
