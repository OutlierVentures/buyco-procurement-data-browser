#!/bin/sh

cat "$1" | iconv -f "windows-1252" -t "UTF-8" > $1.preprocessed.csv

