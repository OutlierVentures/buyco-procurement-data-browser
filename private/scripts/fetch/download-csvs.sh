#!/bin/sh

wget -P $1 -rH -l $2 --accept csv --no-directories --no-check-certificate $3
