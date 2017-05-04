import { Meteor } from 'meteor/meteor';
import { Spending } from '../spending';
import { removeEmptyFilters } from '/imports/utils';

// console.log("spendingPerTime publish.js");

const collectionName = "spendingPerTime";

Meteor.publish(collectionName, function (filters, options) {
    let period = "quarter";
    if (options && options.period)
        period = options.period;

    let pipeLine = [];

    removeEmptyFilters(filters);
    console.log('spendingPerTime-filters = ', filters);
    console.log('spendingPerTime-options = ', options);
    if (filters) {
        pipeLine.push({ $match: filters });
    }
    let groupClause = { $group: { _id: { year: { $year: "$payment_date" } }, totalAmount: { $sum: "$amount_net" }, count: { $sum: 1 } } };

    if (period == "month")
        groupClause.$group._id.month = { $month: "$payment_date" };
    else if (period == "quarter")
        groupClause.$group._id.quarter = { $ceil: { $divide: [{ $month: "$payment_date" }, 3] } };

    // Group by options.groupField, usually "organisation_name". In case of a single organisation, will give one
    // record per period. In case of N organisations, max N records per period (depending
    // on whether that organisation has data in the period).
    if(options.groupField)
        groupClause.$group._id[options.groupField] = "$" + options.groupField;

    pipeLine.push(groupClause);

    let sortClause = {
        "$sort": {
            "_id.organisation_name": 1,
            "_id.year": 1,
            ["_id." + period]: 1,
        }
    };
    pipeLine.push(sortClause);

    // console.log("spendingPerTime pipeLine", JSON.stringify(pipeLine));

    // Call the aggregate
    let cursor = Spending.aggregate(
        pipeLine
    ).forEach((doc) => {
        doc._group = doc._id;
        doc._id = JSON.stringify(doc).hashCode();

        // We add each document to the published collection so the subscribing client receives them.
        console.log('spendingPerTime - collection = ', doc);
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

