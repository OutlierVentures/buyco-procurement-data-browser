r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

console.log("spendingGrouped publish.js");

const collectionName = "spendingGrouped";

/**
 * A collection for getting spending amount by a group field (category, service, supplier).
 */
Meteor.publish(collectionName, function (filters, options) {
    var self = this;

    console.log("spendingGrouped");
    console.log("filters", filters);
    console.log("options", options);

    let groupField;

    // We allow grouping by these fields
    if (options.groupField == "procurement_classification_1"
        || options.groupField == "supplier_name"
        || options.groupField == "sercop_service")
        groupField = options.groupField;
    else
        return;

    // Run the rethinkdb reactive query to get the data.
    var q = r.table('public_spending');

    let indexUsed = false;

    // We can only use 1 index, and it has to be the first call (getAll()). We prefer the most specific
    // fields to use by index because it will give us the smallest amount of results to further filter.
    // TODO: refactor this to a query generator module which is reused by all rethinkdb publishers
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

    q = q.group(groupField);

    q = q.sum('amount_net');

    q = q.ungroup().orderBy(r.desc("reduction"));

    q.run(Connection, Meteor.bindEnvironment(function (error, cursor) {
        console.log("spendingGrouped: got cursor results.");

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

            // Add _id for minimongo
            row._id = row.group;            

            // console.log("Processing spendingGrouped row: " + JSON.stringify(row));

            if (error) {
                console.error(error);
            } else {
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

