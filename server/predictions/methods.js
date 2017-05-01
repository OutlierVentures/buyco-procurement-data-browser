import { PredictionRuns } from '/imports/api/predictionRuns';
import { Predictions } from '/imports/api/predictions';
import { Spending } from '/server/bigchaindb/spending';

export function executePredictionStep(predictionRunId) {
    if (Meteor.isServer) {
        console.log("executePredictionStep", predictionRunId);

        // Load data for all councils, all time

        let data = [];
        // const spendingRaw = Spending.rawCollection();
        // const findSpending = Meteor.wrapAsync(spendingRaw.find, Spending);

        // var cursor = findSpending({}, { organisation_name: 1, procurement_classification_1: 1, amount_net: 1 })

        var cursor = Spending.find({
            organisation_name: "Wakefield MDC"
        }, {
                fields: { organisation_name: 1, procurement_classification_1: 1, amount_net: 1, payment_date: 1 }
                // , limit: 10 
            });

        //console.log("data length", cursor.length);
        cursor.forEach((doc) => {
            doc.month = new Date(doc.payment_date.getFullYear(), doc.payment_date.getMonth(), 1);
            data.push(doc);
        });

        console.log("data length after forEach", data.length);

        console.log(data[0]);

    }
}

/**
 * For a prediction_run, returns a set of parameters for which a prediction is
 * yet to be generated.
 * 
 * @param {*string} predictionRunId 
 */
function getFirstUnprocessedParameters(predictionRunId) {

}

Meteor.methods({
    executePredictionStep
});
