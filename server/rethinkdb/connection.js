r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Config } from './config';

export let Connection;

Meteor.startup(function () {
    console.log("Connecting to RethinkDB...");
    r.connect({ host: Config.host, port: Config.port, db: Config.db }, function (err, conn) {
        if (err) throw err;
        console.log("Connected to RethinkDB with parameters:");
        console.log("Host: " + conn.host + ", port: " + conn.port + ", db: " + conn.db);
        Connection = conn;
    });
});

