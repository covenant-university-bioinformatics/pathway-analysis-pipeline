FROM node:16

ENV CI=true

WORKDIR /app

COPY package.json ./

RUN npm install -g @nestjs/cli

RUN npm install

COPY ./ ./

RUN chmod 775 pipeline_scripts/eMAGMA.sh
#RUN chmod 775 pipeline_scripts/Genes.R
#RUN chmod 775 pipeline_scripts/pathway_link.R
#RUN chmod 775 pipeline_scripts/plot_qq_manhattan.R
#RUN chmod 775 pipeline_scripts/plots.R

#install R and packages
RUN apt update
RUN apt-get install -y r-base
RUN apt-get install -y -qq r-cran-qqman

#remove windows line endings
RUN apt-get install dos2unix
RUN dos2unix pipeline_scripts/eMAGMA.sh
#RUN dos2unix pipeline_scripts/Genes.R
#RUN dos2unix pipeline_scripts/pathway_link.R
#RUN dos2unix pipeline_scripts/plot_qq_manhattan.R
#RUN dos2unix pipeline_scripts/plots.R

RUN npm run build

CMD [ "npm", "run", "start:prod" ]
