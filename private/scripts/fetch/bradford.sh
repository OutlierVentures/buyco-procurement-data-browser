#!/bin/sh

export BASENAME=bradford
export BASEDIR=data/$BASENAME

# Delete previously downloaded files
#rm $BASEDIR/*.csv

./download-csvs.sh $BASEDIR 1 https://www.bradford.gov.uk/open-data/our-datasets/expenditure-greater-than-500-in-value/

# Move to the directory to make the rename command work on local file names
cd $BASEDIR

# Add prefix to files
rename s/^/${BASENAME}_/ *.csv

# The encoding is ANSI. Convert to UTF-8. iconv has to write to new files.
export TMP_PATH=preprocessed
mkdir $TMP_PATH

for f in *.csv; do
    # Strip the first 2 lines as they are empty.
    tail -n +3 $f | iconv -f "windows-1252" -t "UTF-8" > $TMP_PATH/$f; 
done

# Move the files with correct encoding to the output path.
rm ./*.csv
mv $TMP_PATH/*.csv .
rm -rf $TMP_PATH/

cd -
