#!/bin/sh

export BPDB_ROOT_URL=http://publicdata.works.dev:4141
export BPDB_ENV=development
export BPDB_PORT=4141

make build-app
make build-db
