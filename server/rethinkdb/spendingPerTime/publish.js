r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

console.log("spendingPerTime publish.js");

const collectionName = "spendingPerTime";

// On the server side, we publish the collection "blocks" in a custom way, by 
// querying a rethinkdb table. On the client we publish it as a normal Mongo
// collection so that minimongo will be used. When minimongo calls the server
// side to get data, the code below is used.
// Because the RethinkDB connection lives only on the server, the modules to
// query it are under /server and not /import or anywhere else.
// Source for this approach: https://medium.com/@danphi/meteor-and-rethinkdb-db8864762139
Meteor.publish(collectionName, function (filters) {
    var self = this;

    console.log("spendingPerTime");
    console.log(filters);

    // Run the rethinkdb reactive query to get the data.
    var q = r.table('public_spending');

    let indexUsed = false;

    // We can only use 1 index, and it has to be the first call (getAll()). We prefer the most specific
    // fields to use by index because it will give us the smallest amount of results to further filter.
    if (filters.procurement_classification_1)
        if (!indexUsed) {
            console.log("Using index for procurement_classification_1.");
            q = q.getAll(filters.procurement_classification_1, { index: "procurement_classification_1" });
            indexUsed = true;
        }
        else
            q = q.filter({ procurement_classification_1: filters.procurement_classification_1 });

    if (filters.sercop_service)
        if (!indexUsed) {
            console.log("Using index for sercop_service.");
            q = q.getAll(filters.sercop_service, { index: "sercop_service" });
            indexUsed = true;
        }
        else
            q = q.filter({ sercop_service: filters.sercop_service });

    if (filters.organisation_name)
        if (!indexUsed) {
            console.log("Using index for organisation_name.");
            q = q.getAll(filters.organisation_name, { index: "organisation_name" });
            indexUsed = true;
        }
        else
            q = q.filter({ organisation_name: filters.organisation_name });

    q = q.group(r.row("payment_date").year(), r.row("payment_date").month())
        .sum('amount_net');

    q.run(Connection, Meteor.bindEnvironment(function (error, cursor) {
        // On an "all" query for an organisation, the query takes 20s, while in the data explorer it takes 4-6s.
        // Odd.
        console.log("spendingPerTime: got cursor results.");

        if (error) {
            console.log("Error while fetching spending cursor");
            console.error(error);
            return;
        }

        // The RethinkDB cursor has been opened. For each of the items we call the 
        // Meteor "added", "removed" and "changed" functions so that the RethinkDB
        // data is progressed to the client.            
        cursor.each(function (error, row) {
            if (error) {
                console.error(error);
                return;
            }
            let yearMonth = row.group[0] + "-" + row.group[1];
            // console.log("Processing spendingPerTime row: " + yearMonth);
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

