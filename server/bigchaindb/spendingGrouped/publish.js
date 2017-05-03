import { Meteor } from 'meteor/meteor';
import { Spending } from '../spending';
import { removeEmptyFilters } from '/imports/utils';
import { computePrediction } from '../../predictions';

// console.log("spendingGrouped publish.js");

const collectionName = "spendingGrouped";

/**
 * Publish the distinct categories.
 * For aggregations we use the approach with directly calling the low-level added/changed/removed
 * interface explained here: http://docs.meteor.com/api/pubsub.html#Meteor-publish
 */
Meteor.publish(collectionName, function (filters, options) {
    var self = this;
    let groupField;

    // We allow grouping by these fields
    if (options.groupField == "procurement_classification_1"
        || options.groupField == "supplier_name"
        || options.groupField == "sercop_service")
        groupField = options.groupField;
    else
        return;

    let pipeLine = [];

    removeEmptyFilters(filters);

    if (filters) {
        pipeLine.push({ $match: filters });
    }

    let groupClause = { $group: { _id: '$' + groupField, totalAmount: { $sum: "$amount_net" }, count: { $sum: 1 } } };

    // Include the filtered fields in the result documents so the client can filter
    // them too.
    if (filters) {
        for (let k in filters) {
            if (filters[k] !== undefined)
                groupClause.$group[k] = { $first: '$' + k };
        }
    }
    
    groupClause.$group._id.organisation_name = "$organisation_name";

    pipeLine.push(groupClause);

    let sortClause = {
        "$sort": { "totalAmount": -1 }
    };
    pipeLine.push(sortClause);

    let limitAmount = 10;

    let limitClause = {
        $limit: limitAmount
    }
    pipeLine.push(limitClause);

    // console.log("spendingGrouped pipeLine", JSON.stringify(pipeLine));

    // Call the aggregate
    let cursor = Spending.aggregate(
        pipeLine
    ).forEach((doc) => {
        doc._group = doc._id;
        doc._id = JSON.stringify(doc).hashCode();

        // Store the groupField in the row so that the client can use it for filtering.
        doc.groupField = groupField;

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

