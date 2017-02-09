# PublicData.Works public spending data browser

Meteor app for browsing and visualising spending data stored in a BigchainDB/MongoDB backend.

Live environments:

- Development (`develop` branch): [http://dev.app.publicdata.works](http://dev.app.publicdata.works)
- Staging (`master` branch): [http://staging.app.publicdata.works](http://staging.app.publicdata.works) - to be set up

## Components

- Meteor app
- Meteor MongoDB instance (`mongo`)
- BigchainDB MongoDB instance (`mongo_bigchaindb`)

# Development environment setup

Development and running the app has been tested on Ubuntu 14.04. It will likely work out of the box on Mac OS X, too.

On Windows, the best option is to use an Ubuntu virtual machine using Virtualbox or similar. Use Vagrant to quickly create a clean Ubuntu VM. To get access to the files from the Windows host, sharing the files using Samba works great.

## Ubuntu 14.04 (and likely Ubuntu 16.04, Mac OS X)

### Dependencies
Ensure that dependencies are installed:

- [Node.js >= 4](https://nodejs.org/en/)
- [Meteor >= 1.4](https://www.meteor.com/install)
- [MongoDB >= 3.2.0](https://docs.mongodb.com/manual/installation/)

### Git clone and branch

Clone the repository in a working folder:

```
git clone git@github.com:OutlierVentures/buyco-procurement-data-browser.git
```

Create a working branch to create your changes. Create a pull request when you want something to be committed to `develop`.

```
git checkout -b my-new-branch
```

### Configuration

The app uses two MongoDB instances:

- Meteor MongoDB instance (`mongo`) - Meteor sets this up automatically, nothing to do here.
- BigchainDB MongoDB instance (`mongo_bigchaindb`) - This we'll have to set up.

#### `mongo_bigchaindb` on a separate MongoDB instance

Set up a MongoDB server by following [the installation steps for your OS](https://docs.mongodb.com/manual/installation/).

If you're using a MongoDB instance that is not running on the default `mongo://localhost:27017`, set the environment variable `MONGO_BIGCHAINDB_URL` to its URL.

### Running the app

```
meteor npm install
meteor run
```

The app should now be available at `http://localhost:3000`. Initially it won't show any data.

## Run using Docker

A docker configuration for containerised deployment is included under `.deploy/`. It can be used to quickly get a local environment up and running without any dependencies besides Docker and docker-compose.

### Dependencies

- [Docker >= 1.13](https://www.docker.com/products/docker)
- [docker-compose](https://docs.docker.com/compose/install/)

### Running

```
cd .deploy
source ./set-env.sh
make build-app
```

The app should now be reachable at `http://localhost:4141`.

The port can be changed before building, using the environment variables as they are found in `.deploy/set-env.sh`. For example to run on port 8888:

```
cd .deploy
source ./set-env.sh
BPDB_PORT=8888 make build-app
```

# Importing open spending data

Spending data currently lives in a table `public_spending` in the `mongo_bigchaindb` MongoDB instance.

## Get the data

Download the latest public spending data dump:

```
wget https://www.blockstars.io/projects/public-data-works/public_spending.bson https://www.blockstars.io/projects/public-data-works/public_spending.metadata.json
```

## Import the data

Ensure that your `mongo_bigchaindb` instance doesn't currently have a table `public_spending`. Drop it if necessary. Using the mongo shell:

```
use bigchain
db.public_spending.drop()
```

Restore the data file to the `mongo_bigchaindb` Mongo instance. The file is in BSON format, so we have to use `mongorestore` to import it.

When using a local MongoDB installation on the default port:

```
mongorestore -d bigchain public_spending.bson
```

When using the Meteor MongoDB instance, ensure that the app is running (`meteor run`) and restore the data to that instance:

```
mongorestore --port 3001 -d bigchain ../import/public_spending.bson
```

You should see something like:

```
2017-02-09T20:42:21.097+0000    checking for collection data in public_spending.bson
2017-02-09T20:42:21.098+0000    reading metadata for bigchain.public_spending from public_spending.metadata.json
2017-02-09T20:42:21.111+0000    restoring bigchain.public_spending from public_spending.bson
2017-02-09T20:42:22.861+0000    no indexes to restore
2017-02-09T20:42:22.865+0000    finished restoring bigchain.public_spending (212993 documents)
2017-02-09T20:42:22.868+0000    done
```

## When using Docker

When running using Docker, the data has to be restored on the container named `buyco_procurement_data_browser_mongo_bigchaindb_development`.

Start a bash shell in the running container:

```
docker exec -ti buyco_procurement_data_browser_mongo_bigchaindb_development bash
```

Install wget to download the files:

```
apt-get install wget
```

Then follow the above steps.


## See the data in the app

When you now open the app, you should see data of several UK Councils in the list of transactions under `/spending` and charts under `/spending/time`.

# Tools

## Accessing the MongoDB databases

Databases can be accessed using the mongo shell, `mongo`. For a GUI environment, [Robomongo](https://robomongo.org) works great.

