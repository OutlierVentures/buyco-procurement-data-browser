import { Meteor } from 'meteor/meteor';
import { ClientSpending } from '../clientSpending';
import { removeEmptyFilters } from '../utils';

// console.log("clientSpendingPerTime publish.js");

const collectionName = "clientSpendingPerTime";

Meteor.publish(collectionName, function (filters, options) {
    // console.log("clientSpendingPerTime");
    // console.log(filters);

    removeEmptyFilters(filters);

    // Only deliver data when a client is selected that the user has permission to.
    if (!filters.client_id)
        return;

    // Only users with viewer/admin role for this org are allowed to access.
    if (!(Roles.userIsInRole(this.userId, 'viewer', filters.client_id)
        || Roles.userIsInRole(this.userId, 'admin', filters.client_id)))
        throw new Meteor.Error(403);

    let period = "quarter";
    if (options && options.period)
        period = options.period;

    let pipeLine = [];

    removeEmptyFilters(filters);

    if (filters) {
        pipeLine.push({ $match: filters });
    }

    let groupClause = { $group: { _id: { year: { $year: "$effective_date" } }, totalAmount: { $sum: "$amount_net" }, count: { $sum: 1 } } };

    if (period == "month")
        groupClause.$group._id.month = { $month: "$effective_date" };
    else if (period == "quarter")
        groupClause.$group._id.quarter = { $ceil: { $divide: [{ $month: "$effective_date" }, 3] } };

    // Group by options.groupField, usually "organisation_name". In case of a single organisation, will give one
    // record per period. In case of N organisations, max N records per period (depending
    // on whether that organisation has data in the period).
    if(options.groupField)
        groupClause.$group._id[options.groupField] = "$" + options.groupField;

    pipeLine.push(groupClause);

    let sortClause = {
        "$sort": {
            "_id.year": 1,
            ["_id." + period]: 1,
        }
    };
    pipeLine.push(sortClause);

    // console.log("clientSpendingPerTime pipeLine", JSON.stringify(pipeLine));

    // Call the aggregate
    let cursor = ClientSpending.aggregate(
        pipeLine
    ).forEach((doc) => {
        doc._group = doc._id;
        doc._id = JSON.stringify(doc._id).hashCode()

        // We add each document to the published collection so the subscribing client receives them.
        this.added(collectionName, doc._id, doc);
    });

    // Stop observing the cursor when client unsubs.
    // Stopping a subscription automatically takes
    // care of sending the client any removed messages.
    this.onStop(() => {
        if (cursor)
            cursor.stop();
    });

    this.ready();

});

