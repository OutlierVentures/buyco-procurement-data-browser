#!/bin/sh

wget -P $1 -rH -l $2 --accept csv,xls,xlsx --no-directories --no-check-certificate $3

# Wget stores robots.txt* even with --accept set. Remove these.
rm $1/robots.txt*
