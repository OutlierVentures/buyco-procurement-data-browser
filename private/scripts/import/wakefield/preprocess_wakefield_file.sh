#!/bin/sh

cat $1 | grep -vE '^Wakefield Council Supplier Spend Greater Than ' | grep -vE '^,+\s$' | grep -vE '^VERSION 2 NOTE' | iconv -f "windows-1252" -t "UTF-8" |  sed 's/,,,,,,,,,,,,,,,,,,,,,,//g' | sed 's/,,,,,,,,,,,,,,,,,,,,//g' | sed 's/,,,,,,,,,,,,,,,,,,//g' > $1.preprocessed.csv

