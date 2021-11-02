#!/usr/bin/env bash

##### pascal
## To Run
# Pascal --pval=GWAS_summary  outdir {afr,eur,amr,sas,eas} {on,off}

####### Downloading files
### wget http://www2.unil.ch/cbg/images/3/3d/PASCAL.zip
### unzip PASCAL.zip; cd PASCAL; bash installScript.sh


#### Input file delimiter
## tab-separted


#### Input GWAS Summary columns
## 1- SNP-ID without header
## 2- P-value  without header



## Default --mafcutoff is 0.5, --mafcutoff=0.5
## The default  upstream window is 50000, --up=50000
## The default  downstream window is 50000, --down=50000
## --genesetfile for gene set file; The default is resources/genesets/msigdb/msigBIOCARTA_KEGG_REACTOME.gmt

## To download to custom 1000 genomes ---> https://drive.google.com/drive/folders/1lrMNjDaxmRir7BvA9J7mSURTXUO5Uz5X?usp=sharing


set -x	## To debug

bin_dir="/media/yagoubali/bioinfo/web-applictaion/PASCAL-pipeline/PASCAL";

gwas_summary=$1;
outdir=$2;
population=$3; #  {afr, amr, eur, eas, sas}

runpathway=$4 #{on, off}
#### add more  variables to set the default values


####### Run Pascal
## Output files are produced in {PascalPackage}/output/
### Output file name EUR.CARDIoGRAM_2010_lipids.HDL_ONE.MYNAME.genescores.chr22.txt


##### Parameters
##1.  Defualt maximum number of SNPs per gene is 3000,  --maxsnp=3000
maxsnp=$5
if [[ "$maxsnp" -eq '' ]]; then
  maxsnp=3000;
fi

##2.  Default genescoring method is sum,  --genescoring=sum
## two options {max, sum}
genescoring=$6
if [[ "$genescoring" -eq '' ]]; then
  genescoring=sum;
fi

##3. Default genomic distance in mega-bases that the program uses to fuse nearby genes during the pathway analysis is 1
mergedistance=$7
if [[ "$mergedistance" -eq '' ]]; then
  mergedistance=1;
fi

##4. SNPs with maf below that value in the european samle of 1KG will be ignored.
## The default is 0.05. This option should be supplied with a number between 0 and 1
mafcutoff=$8
if [[ "$mafcutoff" -eq '' ]]; then
  mafcutoff=0.05;
fi

##5.
cd ${bin_dir}
if [[ "$runpathway" -eq "on" ]]; then
bash Pascal --pval=$gwas_summary \
        --customdir=${bin_dir}/custom-1000genomes  --custom=$population \
        --runpathway=on  \
        --maxsnp=$maxsnp \
        --genescoring=$genescoring \
        --mergedistance=$mergedistance \
        --mafcutoff=$mafcutoff \
        --outdir=${outdir} #\
      else
    bash Pascal    -pval=$gwas_summary \
                --customdir=${bin_dir}/custom-1000genomes  --custom=$population \
                --maxsnp=$maxsnp \
                --genescoring=$genescoring \
                --mergedistance=$mergedistance \
                --mafcutoff=$mafcutoff \
                --outdir=${outdir} #\
fi


## --outsuffix=${outsuffix}
##### Output files:
## 1- ${gwas_summary}.sum.genescores.txt  ----> The gene score results.
## 2- ${gwas_summary}.PathwaySet--msigBIOCARTA_KEGG_REACTOME--sum.txt ----> The pathway score results.
## 3- ${gwas_summary}.sum.fusion.genescores.txt  ----> The fusion gene score results.
## 4- ${gwas_summary}.sum.numSnpError.txt ----> A file containing all genes that contain no SNPs or contain more SNPs than given by the --maxsnp option
## 5- ${gwas_summary}.sum.fusion.numSnpError.txt  ---> A file containing all genes that contain no SNPs or contain more SNPs than given by the --maxsnp option
### ## 5- ${gwas_summary}.*.ComputeError.txt  --->  Failed to compute
