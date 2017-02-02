r = require('rethinkdb');

import { Meteor } from 'meteor/meteor';
import { Connection } from '../connection';

console.log("spendingGrouped publish.js");

const collectionName = "spendingGrouped";

/**
 * Javascript implementation of Java's string.hashCode()
 * Source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
String.prototype.hashCode = function () {
    var hash = 0,
        strlen = this.length,
        i,
        c;
    if (strlen === 0) {
        return hash;
    }
    for (i = 0; i < strlen; i++) {
        c = this.charCodeAt(i);

        hash = ((hash << 5) - hash) + c;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

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

    q = q.ungroup().orderBy(r.desc("reduction")).limit(20);

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

            // Store the groupField and filters in the row so that the client side can properly 
            // filter it.
            // Subscriptions are per client session, so subscriptions between multiple sessions
            // won't overlap. However the client can have multiple subscriptions to this collection
            // with a different group field and filters, which leads to different results.
            // The client is supplied with the complete result set and therefore must filter these
            // results through minimongo.
            row.groupField = groupField;
            row.organisation_name = filters.organisation_name;
            row.procurement_classification_1 = filters.procurement_classification_1;
            row.sercop_service = filters.sercop_service;

            // Add _id for minimongo. We use a simple hash function based on the group, filter and value
            // to get unique values.
            let fingerprint = groupField + JSON.stringify(filters) + row.group;
            // console.log("fingerprint", fingerprint);
            row._id = fingerprint.hashCode();

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

