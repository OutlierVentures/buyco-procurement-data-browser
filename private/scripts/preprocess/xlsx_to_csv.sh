#!/bin/sh

export LO_PATH=/c/Program\ Files/LibreOffice\ 5/program/scalc.exe

mkdir $1/csv

for n in $1/*.xls*
do
	echo Converting $n
	#mv $n $n.xlsx
	"$LO_PATH" --headless --convert-to csv "$n" --outdir $1/csv
done