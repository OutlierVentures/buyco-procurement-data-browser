r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

console.log("spending publish.js");

const collectionName = "spending";

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
    var q = r.table('wakefield_spending');

    q = q.orderBy({
        // The field to order by must be an index. If necessary, create using:
        // r.table('posts').indexCreate('date').run(conn, callback);
        // Can also order by a non-indexed field:
        // .orderBy('fieldName')
        index: r.asc('id')
    });

    // Add an "_id" field to make minimongo happy.
    q = q.merge({ "_id": r.row("id") });

    // Apply pagination parameters.
    // The options collection looks like this:
    // {
    // 	"sort": {
    // 		"name_sort": 1
    // 	},
    // 	"limit": 3,
    // 	"skip": 0
    // }

    // Support for .limit / .skip in changefeeds is limited. Various issues logged.
    // We apply a workaround with bad performance that works well for low page sizes.
    // Effectively we get data for _all_ pages until the current page in the changefeed,
    // then skip ahead past all the previous pages and just return the records for
    // the current page.
    // https://github.com/rethinkdb/rethinkdb/issues/4500#issue-93024000
    // q = q.limit(options.limit + options.skip || 10);

    // Filter by search string
    if (searchString)
        q = q.filter(
            r.row("organisation_name").match("(?i)" + searchString)
                .or(r.row("procurement_classification_1").match("(?i)" + searchString))
                .or(r.row("purpose").match("(?i)" + searchString))
        );

    q = q.skip(options.skip);
    q = q.limit(options.limit || 10);


    // Turn the query into a changefeed so that we get the results reactively.
    // The call to .changes() needs to be last, i.e. any filtering/sorting/manipulating 
    // functions need to be called before it.
    // q = q.changes({
    //     includeInitial: true,
    //     squash: true,
    //     includeTypes: true,
    //     includeOffsets: false,
    //     includeStates: false
    // });

    // Using the workaround for .limit.skip with changefeeds, we need to call .skip()
    // after .changes(), because we apply it to the returned feed.
    // if (options.skip) {
    //     // console.log("Skip " + options.skip);
    //     q = q.skip(options.skip); //.limit(options.limit);
    //     // There is another workaround for paging in changefeeds. Has bad performance
    //     // however and haven't gotten it to work.
    //     // https://github.com/rethinkdb/rethinkdb/issues/4909
    //     // q = q.filter(function (c) {
    //     //     return c.hasFields("old_offset").and(c('old_offset').gt(options.skip))
    //     //         .or(c.hasFields("new_offset").and(c('new_offset').gt(options.skip)));
    //     // })
    // }

    q.run(Connection, Meteor.bindEnvironment(function (error, cursor) {
        // console.log("Running RethinkDB query with search string: " + JSON.stringify(searchString));
        if (error) {
            console.log("Error while fetching spending cursor");
            console.error(error);
            return;
        }

        // The RethinkDB cursor has been opened. For each of the items we call the 
        // Meteor "added", "removed" and "changed" functions so that the RethinkDB
        // data is progressed to the client.            
        cursor.each(function (error, row) {
            // console.log("Processing spending row: " + JSON.stringify(row.id));
            if (error) {
                console.error(error);
            } else {
                // For changefeeds
                // if (row.new_val && !row.old_val) {
                //     self.added(collectionName, row.new_val._id, row.new_val);
                // } else if (!row.new_val && row.old_val) {
                //     self.removed(collectionName, row.old_val._id);
                // } else if (row.new_val && row.old_val) {
                //     self.changed(collectionName, row.new_val._id, row.new_val);
                // }

                // For non-changefeeds
                self.added(collectionName, row._id, row);
            }
        });

        self.onStop(function () {
            cursor.close();
        });

        self.ready();
    }));

    // TODO: publish counts from rethinkdb. Need to pass a function to Counts.publish, but 
    // we can't just do [collection].find().
    // The below is incorrect in any case.
    // r.table('wakefield_spending').count().run(Connection, Meteor.bindEnvironment(function (error, result) {
    //     console.log("Count result: " + JSON.stringify(result));
    //     Counts.publish(this, 'spendingTransactionsCount', result, { noReady: true });
    // }));


});

