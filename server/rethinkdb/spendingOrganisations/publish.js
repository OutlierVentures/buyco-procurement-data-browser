r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

const collectionName = "spendingOrganisations";

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
    var q = r.table('public_spending');

    console.log("Spending organisations query");

    q = q.pluck("organisation_name").distinct()

    // Filter by search string
    if (searchString)
        q = q.filter(
            r.row("organisation_name").match("(?i)" + searchString)
        );

    q.run(Connection, Meteor.bindEnvironment(function (error, cursor) {
        // console.log("Running RethinkDB query with search string: " + JSON.stringify(searchString));
        if (error) {
            console.log("Error while fetching organisations cursor");
            console.error(error);
            return;
        }

        // The RethinkDB cursor has been opened. For each of the items we call the 
        // Meteor "added", "removed" and "changed" functions so that the RethinkDB
        // data is progressed to the client.            
        let count = 0;
        cursor.each(function (error, row) {            
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
                // Add an "_id" field to make minimongo happy.
                row._id = "org" + count;

                console.log("Adding spending org row: " + JSON.stringify(row));
                self.added(collectionName, row._id, row);
                count++;
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

