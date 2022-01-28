import * as mongoose from 'mongoose';
import { JobStatus } from './pathwaybased.jobs.model';

export enum Populations {
  AFR = 'afr',
  AMR = 'amr',
  EUR = 'eur',
  EAS = 'eas',
  SAS = 'sas',
}

export enum RunPathwayOptions {
  ON = 'on',
  OFF = 'off',
}

export enum GeneScoringOptions {
  SUM = 'sum',
  MAX = 'max',
}

export enum GeneSetFileOptions {
  MSIGDB_ENTREZ = 'msigdb.v4.0.entrez',
  KEGG_REACTOME = 'msigBIOCARTA_KEGG_REACTOME',
}

//Interface that describe the properties that are required to create a new job
interface PathwayBasedAttrs {
  job: string;
  filename_prefix: string;
  useTest: string;
  marker_name: string;
  p_value: string;
  population: Populations;
  run_pathway: RunPathwayOptions;
  chr: string;
  gene_set_file: GeneSetFileOptions;
  pvalue_cutoff: string;
  up_window: string;
  down_window: string;
  max_snp: string;
  gene_scoring: GeneScoringOptions;
  merge_distance: string;
  maf_cutoff: string;
}

// An interface that describes the extra properties that a ticket model has
//collection level methods
interface PathwayBasedModel extends mongoose.Model<PathwayBasedDoc> {
  build(attrs: PathwayBasedAttrs): PathwayBasedDoc;
}

//An interface that describes a properties that a document has
export interface PathwayBasedDoc extends mongoose.Document {
  id: string;
  version: number;
  useTest: boolean;
  marker_name: number;
  p_value: number;
  filename_prefix: string;
  population: Populations;
  run_pathway: RunPathwayOptions;
  chr: string;
  gene_set_file: GeneSetFileOptions;
  pvalue_cutoff: string;
  up_window: string;
  down_window: string;
  max_snp: string;
  gene_scoring: GeneScoringOptions;
  merge_distance: string;
  maf_cutoff: string;
}

const PathwayBasedSchema = new mongoose.Schema<
  PathwayBasedDoc,
  PathwayBasedModel
>(
  {
    useTest: {
      type: Boolean,
      trim: true,
    },
    marker_name: {
      type: Number,
      trim: true,
    },
    p_value: {
      type: Number,
      trim: true,
    },
    population: {
      type: String,
      enum: [
        Populations.AFR,
        Populations.AMR,
        Populations.EUR,
        Populations.EAS,
        Populations.SAS,
      ],
      trim: true,
    },
    run_pathway: {
      type: String,
      enum: [RunPathwayOptions.ON, RunPathwayOptions.OFF],
      trim: true,
    },
    chr: {
      type: String,
      trim: true,
    },
    gene_set_file: {
      type: String,
      enum: [
        GeneSetFileOptions.MSIGDB_ENTREZ,
        GeneSetFileOptions.KEGG_REACTOME,
      ],
      trim: true,
    },
    pvalue_cutoff: {
      type: String,
      trim: true,
    },
    up_window: {
      type: String,
      trim: true,
    },
    down_window: {
      type: String,
      trim: true,
    },
    max_snp: {
      type: String,
      trim: true,
    },
    gene_scoring: {
      type: String,
      enum: [GeneScoringOptions.MAX, GeneScoringOptions.SUM],
      trim: true,
    },
    merge_distance: {
      type: String,
      trim: true,
    },
    maf_cutoff: {
      type: String,
      trim: true,
    },
    filename_prefix: {
      type: String,
      trim: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GeneBasedJob',
      required: true,
    },
    version: {
      type: Number,
    },
  },
  {
    timestamps: true,
    versionKey: 'version',
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        // delete ret._id;
        // delete ret.__v;
      },
    },
  },
);

//increments version when document updates
PathwayBasedSchema.set('versionKey', 'version');

//collection level methods
PathwayBasedSchema.statics.build = (attrs: PathwayBasedAttrs) => {
  return new PathwayBasedModel(attrs);
};

//create mongoose model
const PathwayBasedModel = mongoose.model<PathwayBasedDoc, PathwayBasedModel>(
  'PathwayBased',
  PathwayBasedSchema,
  'pathwaybaseds',
);

export { PathwayBasedModel };
