#!/bin/sh

echo Starting rethinkdb...

cd
rethinkdb --bind all
cd -
