import { Meteor } from 'meteor/meteor';

import { Predictions } from './collection';

if (Meteor.isServer) {
    const collectionName = 'predictions';

    Meteor.publish(collectionName, function (organisationName, groupField, groupValue, options) {
        let pipeLine = [];
        let filters = {};

        let period = "quarter";
        if (options && options.period)
            period = options.period;

        filters.organisation_name = organisationName;

        if (groupField) {
            filters.group_field = groupField;
            filters.group_value = groupValue;
        }

        pipeLine.push({ $match: filters });

        let groupClause = {
            $group: {
                _id: {
                    organisation_name: "$organisation_name",
                    group_field: "$group_field",
                    group_value: "$group_value",
                    year: { $year: "$effective_date" }
                },
                totalAmount: { $sum: "$amount_net" }, count: { $sum: 1 }
            }
        };

        if (period == "month")
            groupClause.$group._id.month = { $month: "$effective_date" };
        else if (period == "quarter")
            groupClause.$group._id.quarter = { $ceil: { $divide: [{ $month: "$effective_date" }, 3] } };

        pipeLine.push(groupClause);

        let sortClause = {
            "$sort": { "totalAmount": -1 }
        };
        pipeLine.push(sortClause);

        console.log(collectionName + " pipeLine", JSON.stringify(pipeLine));

        // Call the aggregate
        let cursor = Predictions.aggregate(
            pipeLine
        ).forEach((doc) => {
            doc._group = doc._id;
            doc._id = JSON.stringify(doc).hashCode();

            // Store the groupField in the row so that the client can use it for filtering.
            doc.groupField = groupField;

            // console.log(collectionName + " document", JSON.stringify(doc));

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
}