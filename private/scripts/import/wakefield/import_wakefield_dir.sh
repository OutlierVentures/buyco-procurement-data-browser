#!/bin/sh

for f in $1/*.preprocessed.csv
do
	echo "Processing file $f..."
	./import_wakefield_file.sh $f
done
