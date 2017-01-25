#!/bin/sh

rethinkdb import -f $1 --table $2 --format csv --force $3 $4 $5
