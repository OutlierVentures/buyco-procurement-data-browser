#!/bin/sh

export BASENAME=calderdale
export BASEDIR=data/$BASENAME

for year in 2015 2016; do
    ./download-csvs.sh $BASEDIR/$year 2 http://www.calderdale.gov.uk/council/finances/income-spending/index.jsp?year=$year

    # Move to the directory to make the rename command work on local file names
    cd $BASEDIR/$year
    
    rm ./*card*
    rename s/^/${BASENAME}_${year}_/ *.csv

    cd -
done




