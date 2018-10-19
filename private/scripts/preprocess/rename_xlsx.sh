#!/bin/sh

export LO_PATH=/c/Program\ Files/LibreOffice\ 5/program/scalc.exe

# Remove extra .xlsx extension
# for n in *.csv.xlsx; do m=${n%.xlsx}; echo $n; echo $m; mv $n $m; done

# Better use egrep: egrep -L "^[a-zA-Z0-9 ]+,[a-zA-Z0-9 ]+,[a-zA-Z0-9 ]+,[^,]+,[^,]+,[^,]+," *.csv
# (a value that looks like a column name or a value, then some more comma-separated values)

for n in `egrep -L "^[a-zA-Z0-9 /:]+,[a-zA-Z0-9 /:]+,[a-zA-Z0-9 /:]+,[^,]+,[^,]+,[^,]+," *.csv`
do
	echo Moving $n
	mv $n $n.xlsx
	# "$LO_PATH" --headless --convert-to csv "$n.xlsx"
done