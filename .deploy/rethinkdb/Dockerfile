FROM ubuntu:14.04

MAINTAINER Aron van Ammers, aron@outlierventures.io

# Update the image
RUN apt-get update -q && apt-get clean

# Get supporting tools
RUN apt-get install curl git python build-essential -y

RUN source /etc/lsb-release && echo "deb http://download.rethinkdb.com/apt $DISTRIB_CODENAME main" | tee /etc/apt/sources.list.d/rethinkdb.list
RUN wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | apt-key add -
RUN apt-get update
RUN apt-get install rethinkdb

WORKDIR /data

CMD ["rethinkdb", "--bind", "all"]