r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

const collectionName = "spendingCategories";

// On the server side, we publish the collection "blocks" in a custom way, by 
// querying a rethinkdb table. On the client we publish it as a normal Mongo
// collection so that minimongo will be used. When minimongo calls the server
// side to get data, the code below is used.
// Because the RethinkDB connection lives only on the server, the modules to
// query it are under /server and not /import or anywhere else.
// Source for this approach: https://medium.com/@danphi/meteor-and-rethinkdb-db8864762139
Meteor.publish(collectionName, function (organisationName) {
    var self = this;

    // // Run the rethinkdb reactive query to get the data.
    var q = r.table('public_spending');

    q = q.getAll(organisationName, { index: "organisation_name" });

    // This query is slow on a table of 320k records. The field has an index though; is there a way
    // to quickly select all index values?
    q = q.hasFields("procurement_classification_1")
        .pluck("procurement_classification_1").distinct()
        .map({ "name": r.row("procurement_classification_1") });

    q.run(Connection, Meteor.bindEnvironment(function (error, cursor) {
        // console.log("Running RethinkDB query with search string: " + JSON.stringify(searchString));
        if (error) {
            console.log("Error while fetching categories cursor");
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
                // Add an "_id" field to make minimongo happy.
                row._id = "category" + count;

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

