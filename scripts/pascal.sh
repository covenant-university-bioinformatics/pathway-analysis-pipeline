#!/usr/bin/env bash
#run for amr and eur
##### pascal
## To Run
# ./pascal.sh GWAS_summary  outdir {afr,eur,amr,sas,eas} {on,off} {1-22, all} {msigdb_entrez, msigBIOCARTA_KEGG_REACTOME}
# Test
# ./pascal.sh UK_pval_0.05.pascal outdir afr off all msigdb_entrez
# ./pascal.sh UK_pval_0.05.pascal outdir afr off all msigBIOCARTA_KEGG_REACTOME
#./pascal.sh UK_pval_0.05.pascal  outdir afr on all on msigdb_entrez
#./pascal.sh UK_pval_0.05.pascal  outdir afr on all msigBIOCARTA_KEGG_REACTOME
#./pascal.sh UK_pval_0.05.pascal  outdir afr on 1 msigdb_entrez
#./pascal.sh UK_pval_0.05.pascal  outdir afr on 1 msigBIOCARTA_KEGG_REACTOME

####### Downloading files
### wget http://www2.unil.ch/cbg/images/3/3d/PASCAL.zip
### unzip PASCAL.zip; cd PASCAL; bash installScript.sh


#### Input file delimiter
## tab-separted


#### Input GWAS Summary columns
## 1- SNP-ID without header
## 2- P-value  without header

## To download to custom 1000 genomes ---> https://drive.google.com/drive/folders/1lrMNjDaxmRir7BvA9J7mSURTXUO5Uz5X?usp=sharing


set -x	## To debug

bin_dir=/mnt/d/PASCAL;

gwas_summary=$1;
outdir=$2;
population=$3; #  {afr, amr, eur, eas, sas}
runpathway=$4 #{on, off}
chr=$5; #{1-22, all}
genesetfile=$6; # {msigdb_entrez, msigBIOCARTA_KEGG_REACTOME}
# resources/genesets/msigdb/msigdb.v4.0.entrez.gmt
# resources/genesets/msigdb/msigBIOCARTA_KEGG_REACTOME.gmt
pathway_output_suffix=${genesetfile};
if [[ "$genesetfile" == "msigdb_entrez" ]]; then
  genesetfile=${bin_dir}'/resources/genesets/msigdb/msigdb.v4.0.entrez.gmt';
  pathway_output_suffix='msigdb.v4.0.entrez';
else # [[ "$genesetfile" -eq "msigBIOCARTA_KEGG_REACTOME" ]]; then
  genesetfile=${bin_dir}'/resources/genesets/msigdb/msigBIOCARTA_KEGG_REACTOME.gmt';
  pathway_output_suffix='msigBIOCARTA_KEGG_REACTOME';
fi

# add cutoff for pathways file as parameter 7
cutoff_pathways=$7
if [[ -z "$cutoff_pathways" ]]; then
  cutoff_pathways=0.05;
fi
##### Parameters
#### adding more  variables
up=$8 #number of base-pairs upstream of the transcription start site
if [[ -z "$up" ]]; then
  up=50000;
fi

down=$9 #number of base-pairs downstream of the transcription start site
if [[ -z "$down" ]]; then
  down=50000;
fi

maxsnp=${10} #maximum number of SNPs per gene
if [[ -z "$maxsnp" ]]; then
  maxsnp=3000;
fi

genescoring=${11}; # genescoring method  {max, sum}
if [[ -z "$genescoring"  ]]; then
  genescoring=sum;
fi


mergedistance=${12} #genomic distance in mega-bases
if [[ -z "$mergedistance" ]]; then
  mergedistance=1;
fi


mafcutoff=${13} #This option should be supplied with a number between 0 and 1
if [[  -z "$mafcutoff" ]]; then
  mafcutoff=0.05;
fi


cd ${bin_dir}

##1. Run analysis for all chromosomes
if [[ "$chr" == "all" ]]; then
bash Pascal --pval=${gwas_summary} \
        --customdir=${bin_dir}/custom-1000genomes  \
        --custom=$population \
        --runpathway=${runpathway}  \
        --up=$up \
        --down=$down \
        --maxsnp=$maxsnp \
        --genescoring=$genescoring \
        --mergedistance=$mergedistance \
        --mafcutoff=$mafcutoff \
        --genesetfile=$genesetfile \
        --outdir=${outdir}
else
    bash Pascal --pval=$gwas_summary \
                --customdir=${bin_dir}/custom-1000genomes  \
                --custom=$population \
                --runpathway=${runpathway}  \
                --up=$up \
                --down=$down \
                --maxsnp=$maxsnp \
                --genescoring=$genescoring \
                --mergedistance=$mergedistance \
                --mafcutoff=$mafcutoff \
                --genesetfile=$genesetfile \
                --chr=$chr \
                --outdir=${outdir}
fi

### Filter out pathways results based on pvalue cutoff
if [[ "$runpathway" == "on" ]]; then
  ## replace comma with period for math comparrion
  sed -i 's/,/./g' ${outdir}/*${pathway_output_suffix}*.txt
  awk -v pvalue=$cutoff_pathways '{if(NR==1) print $0; if (($2)<=pvalue) print $0}' ${outdir}/*${pathway_output_suffix}*.txt > ${outdir}/${pathway_output_suffix}.txt
fi

#
#
# #
#
# ## --outsuffix=${outsuffix}
# ##### Output files:
# ## 1- ${gwas_summary}.sum.genescores.txt  ----> The gene score results.
# ## 2- ${gwas_summary}.PathwaySet--msigBIOCARTA_KEGG_REACTOME--sum.txt ----> The pathway score results.
# ## 3- ${gwas_summary}.sum.fusion.genescores.txt  ----> The fusion gene score results.
# ## 4- ${gwas_summary}.sum.numSnpError.txt ----> A file containing all genes that contain no SNPs or contain more SNPs than given by the --maxsnp option
# ## 5- ${gwas_summary}.sum.fusion.numSnpError.txt  ---> A file containing all genes that contain no SNPs or contain more SNPs than given by the --maxsnp option
# ### ## 5- ${gwas_summary}.*.ComputeError.txt  --->  Failed to compute
# #fusion.genescores --> Pascal does this by generating ‘fusion’ gene scores for genes that are in linkage with each other
# #https://www.biorxiv.org/content/10.1101/235408v1.full.pdf
