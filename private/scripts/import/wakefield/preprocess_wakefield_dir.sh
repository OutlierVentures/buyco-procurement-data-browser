#!/bin/sh

for f in $1/*.csv
do
	echo "Preprocessing file $f..."
	./preprocess_wakefield_file.sh $f
done
