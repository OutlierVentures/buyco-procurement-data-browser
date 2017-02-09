#!/bin/sh

for f in $1/Published\ Spend*.csv
do
	echo "Processing file $f..."
	./import_doncaster_file.sh "$f"
done
