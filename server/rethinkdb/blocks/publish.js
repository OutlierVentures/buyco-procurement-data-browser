r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

console.log("blocks publish.js");

const collectionName = "blocks";

// On the server side, we publish the collection "blocks" in a custom way, by 
// querying a rethinkdb table. On the client we publish it as a normal Mongo
// collection so that minimongo will be used. When minimongo calls the server
// side to get data, the code below is used.
// Because the RethinkDB connection lives only on the server, the modules to
// query it are under /server and not /import or anywhere else.
// Source for this approach: https://medium.com/@danphi/meteor-and-rethinkdb-db8864762139
Meteor.publish(collectionName, function (options, searchString) {
    var self = this;

    // Run the rethinkdb reactive query to get the data.
    var q = r.table('bigchain')
        .orderBy({
            // The field to order by must be an index. If necessary, create using:
            // r.table('posts').indexCreate('date').run(conn, callback);
            // Can also order by a non-indexed field:
            // .orderBy('fieldName')
            index: r.desc('block_timestamp')
        });

    // Add an "_id" field to make minimongo happy.
    q = q.merge({ "_id": r.row("id") });

    // Filter by search string
    if (searchString)
        q = q.filter(r.row("id").match(searchString));

    // TODO: apply pagination parameters
    // The options collection looks like this:
    // {
    // 	"sort": {
    // 		"name_sort": 1
    // 	},
    // 	"limit": 3,
    // 	"skip": 0
    // }
    console.log("Options: " + JSON.stringify(options));
    if (options && options.limit !== undefined && options.skip !== undefined) {
        // q = q.skip(options.skip).limit(options.limit);
    }

    // Turn the query into a changefeed so that we get the results reactively.
    // The call to .changes() needs to be last, i.e. any filtering/sorting/manipulating 
    // functions need to be called before it.
    q = q.changes({
        includeInitial: true,
        squash: true,
        includeTypes: true,
        includeOffsets: false,
        includeStates: false
    });

    q.run(Connection, Meteor.bindEnvironment(function (error, cursor) {
        // console.log("Running RethinkDB query with search string: " + JSON.stringify(searchString));
        if (error) {
            console.log("Error while fetching blocks cursor");
            console.error(error);
            return;
        }

        // The RethinkDB cursor has been opened. For each of the items we call the 
        // Meteor "added", "removed" and "changed" functions so that the RethinkDB
        // data is progressed to the client.            
        cursor.each(function (error, row) {
            // console.log("Processing row: " + JSON.stringify(row));
            if (error) {
                console.error(error);
            } else {
                if (row.new_val && !row.old_val) {
                    self.added(collectionName, row.new_val._id, row.new_val);
                } else if (!row.new_val && row.old_val) {
                    self.removed(collectionName, row.old_val._id);
                } else if (row.new_val && row.old_val) {
                    self.changed(collectionName, row.new_val._id, row.new_val);
                }
            }
        });

        self.onStop(function () {
            cursor.close();
        });

        self.ready();
    }));

});

// TODO: publish counts from rethinkdb
// Counts.publish(this, 'blocksCount', Blocks.find(), { noReady: true });
