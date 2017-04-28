import { Spending } from '../bigchaindb/spending';
import { Predictions } from '/imports/api/predictions';
import { getRegressionLine } from '/imports/utils/predictions';

/**
 * Calculate a prediction for a single organisation, group field and group value.
 * The prediction is calculated per month.
 */
export function computePrediction(organisationName, groupField, groupValue, forceRecalculate) {
    let period = "quarter";

    // console.log("computePrediction", organisationName, groupField, groupValue);

    if (!groupValue) {
        // console.log("Empty group value, not computing prediction.");
        return;
    }

    let filters = {
        "organisation_name": organisationName,
        "group_field": groupField,
        "group_value": groupValue,
        "type": "linear_regression"
    };

    if (!forceRecalculate && Predictions.findOne(filters)) {
        // console.log("Using existing prediction data.");
        return;
    }

    // Get spending per time for all time
    let spendingData = getGroupedData(organisationName, groupField, groupValue);

    // Feed linear regression with data
    let regressionData = getRegressionLine(spendingData);

    // Get prediction points
    // console.log("computePrediction points", regressionData.points);

    // Delete any old prediction data for this org/group
    Predictions.remove(filters);

    // Insert new prediction data
    // TODO: use bulk insert. Not supported by Meteor collections, have to use rawCollection.
    _(regressionData.points).forEach((point) => {
        if (point._group) { // Some points get undefined groups
            let predictionDoc = {
                organisation_name: organisationName,
                type: "linear_regression",
                group_field: groupField,
                group_value: groupValue,
                amount_net: point.totalAmount
            };

            let month;
            if (period == "month")
                month = point._group.month;
            else
                // Convert to month 0..11. Quarter is in 1..4.
                month = (point._group.quarter - 1) * 3 + 1;

            predictionDoc.effective_date = new Date(point._group.year, month, 1);

            Predictions.insert(predictionDoc);
        }
    });
}

function getGroupedData(organisationName, groupField, groupValue) {
    let period = "quarter";

    let pipeLine = [];

    let filters = {
        "organisation_name": organisationName,
        [groupField]: groupValue
    }

    if (filters) {
        pipeLine.push({ $match: filters });
    }
    let groupClause = { $group: { _id: { year: { $year: "$payment_date" } }, totalAmount: { $sum: "$amount_net" }, count: { $sum: 1 } } };

    if (period == "month")
        groupClause.$group._id.month = { $month: "$payment_date" };
    else if (period == "quarter")
        groupClause.$group._id.quarter = { $ceil: { $divide: [{ $month: "$payment_date" }, 3] } };

    // Always group by organisation name
    groupClause.$group._id["organisation_name"] = "$organisation_name";

    pipeLine.push(groupClause);

    let sortClause = {
        "$sort": {
            "_id.organisation_name": 1,
            "_id.year": 1,
            ["_id." + period]: 1,
        }
    };
    pipeLine.push(sortClause);

    // console.log("computePrediction pipeLine", JSON.stringify(pipeLine));

    // Call the aggregate
    let spendingData = [];
    Spending.aggregate(
        pipeLine
    ).forEach((doc) => {
        doc._group = doc._id;
        spendingData.push(doc);
    });

    // console.log("computePrediction spendingData", spendingData);
    return spendingData;
}
