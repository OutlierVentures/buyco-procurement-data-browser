r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

console.log("spendingPerMonth publish.js");

const collectionName = "spendingPerMonth";

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

    q = q.group(r.row("payment_date").year(), r.row("payment_date").month())
        .sum('amount_net');

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
            if(error) {
                console.error(error);
                return;
            }
            let yearMonth = row.group[0] + "-" + row.group[1];
            // console.log("Processing spendingPerMonth row: " + yearMonth);
            if (error) {
                console.error(error);
            } else {
                // For non-changefeeds
                self.added(collectionName, yearMonth, row);
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

