all: help

start:
	@echo "\nStarting docker containers..."
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} up -d
	docker ps

stop:
	@echo "\nStopping docker containers..."
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} down
	docker ps

build-app: copy-app
	@echo "\nBuilding docker app container..."
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} stop app
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} build app
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} up -d app

rebuild-app: copy-app
	@echo "\nBuilding docker app container with --no-cache..."
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} stop app
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} build --no-cache app
	docker-compose -p buyco-procurement-data-browser-${BPDB_ENV} up -d app

build-db:
	@echo "\nBuilding RethinkDB container..."
	docker-compose -p buyco-procurement-data-rethinkdb-${BPDB_ENV} stop rethinkdb
	docker-compose -p buyco-procurement-data-rethinkdb-${BPDB_ENV} build rethinkdb
	docker-compose -p buyco-procurement-data-rethinkdb-${BPDB_ENV} up -d rethinkdb


copy-app: clean
	@echo "\nBundling meteor app for production..."
	rsync \
		-av \
		--exclude="/.vagrant" \
		--exclude="/.git" \
		--exclude="/Vagrantfile" \
		--exclude="/.deploy" \
		--exclude="/node_modules" \
		../ ./app/src

clean:
	@echo "\nCleaning deploy bundle folder..."
	rm -rf ./app/src/*

help:
	@echo "\n----------"
	@echo "\nmake start - start the docker containers"
	@echo "\nmake stop - stop the docker containers"
	@echo "\nmake build-app - build the app container"
	@echo "\n----------"
