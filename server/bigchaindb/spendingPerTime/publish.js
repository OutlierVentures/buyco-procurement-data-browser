import { Meteor } from 'meteor/meteor';
import { Spending } from '../spending';
import { removeEmptyFilters } from '../utils';

console.log("spendingPerTime publish.js");

const collectionName = "spendingPerTime";

Meteor.publish(collectionName, function (filters, options) {
    console.log("spendingPerTime");
    console.log(filters);

    let period = "quarter";
    if (options && options.period)
        period = options.period;

    let pipeLine = [];

    removeEmptyFilters(filters);

    if (filters) {
        pipeLine.push({ $match: filters });
    }

    let groupClause = { $group: { _id: { year: { $year: "$payment_date" } }, totalAmount: { $sum: "$amount_net" }, count: { $sum: 1 } } };

    if (period == "month")
        groupClause.$group._id.month = { $month: "$payment_date" };
    else if (period == "quarter")
        groupClause.$group._id.quarter = { $ceil: { $divide: [{ $month: "$payment_date" }, 3] } };

    pipeLine.push(groupClause);

    let sortClause = {
        "$sort": {
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

