import { PredictionRuns } from '/imports/api/predictionRuns';
import { Predictions } from '/imports/api/predictions';
import { Spending } from '/server/bigchaindb/spending';
import shaman from 'shaman';

export function executePredictionStep(predictionRunId) {
    if (Meteor.isServer) {
        console.log("executePredictionStep", predictionRunId);

        console.log("shaman", shaman);

        // Load data for all councils, all time

        let data = [];
        // const spendingRaw = Spending.rawCollection();
        // const findSpending = Meteor.wrapAsync(spendingRaw.find, Spending);

        // var cursor = findSpending({}, { organisation_name: 1, procurement_classification_1: 1, amount_net: 1 })

        let groupField = "procurement_classification_1";
        // var cursor = Spending.find({
        //     organisation_name: "Wakefield MDC"
        // }, {
        //         fields: { organisation_name: 1, procurement_classification_1: 1, amount_net: 1, payment_date: 1 }
        //         // , limit: 10 
        //     });
        let pipeLine = [];

        pipeLine.push({ $match: { organisation_name: "Wakefield MDC" } });
        pipeLine.push(
            {
                $group: {
                    _id: {
                        year: { $year: "$payment_date" },
                        month: { $month: "$payment_date" },
                        [groupField]: "$" + groupField
                    },
                    totalAmount: { $sum: "$amount_net" },
                    count: { $sum: 1 }
                }
            });

        pipeLine.push({ $sort: { "totalAmount": -1 } })

        console.log("pipeLine", JSON.stringify(pipeLine));
        var cursor = Spending.aggregate(pipeLine);

        var labels = {};

        cursor.forEach((doc) => {
            // Reduce date to month
            //doc.month = new Date(doc.payment_date.getFullYear(), doc.payment_date.getMonth(), 1);

            // Codify category
            let textValue = doc._id.procurement_classification_1;

            let label = labels[textValue];
            if (!label) {
                label = Object.keys(labels).length;
                labels[textValue] = label;
            }

            doc.label = label;
            data.push(doc);
        });

        console.log("data length after forEach", data.length);
        //console.log("labels", labels);

        // Log data for debugging
        for (let i = 0; i < 10; i++) {
            console.log(data[i]);
        }

        // Prepare array-formed data for linear regression

        var X = [];
        var y = [];

        data.forEach((doc) => {
            let valueArray = [];
            // Try year and month separately. Could put in the point as date as in this example:
            // https://github.com/luccastera/shaman/blob/master/examples/stock.js
            // valueArray.push(doc.month.getFullYear());
            // valueArray.push(doc.month.getMonth());
            valueArray.push(doc._id.year);
            valueArray.push(doc._id.month);

            // Save the label as 1-hot encoding
            for (let i = 0; i < Object.keys(labels).length; i++) {
                if (doc.label == i) {
                    valueArray.push(1);
                }
                else {
                    valueArray.push(0)
                };
            }

            X.push(valueArray);

            y.push(doc.totalAmount || 0);
        });

        console.log("example from X array", JSON.stringify(X[100]));

        var lr = new shaman.LinearRegression(X, y,
            // { algorithm: 'GradientDescent', learningRate: 0.3, numberOfIterations: 5000 }
            { algorithm: 'NormalEquation' }
            // { algorithm: 'GradientDescent', debug: true }
        );
        lr.train(function (err) {
            if (err) { throw err; }
            let y = 2018, cat = 4;

            // Create an example value array for the predictions
            let valueArray = [];
            valueArray.push(y);
            valueArray.push(1);

            let desiredLabel = cat;
            let labelKeys = Object.keys(labels);

            for (let i = 0; i < labelKeys.length; i++) {
                if (desiredLabel == i) {
                    valueArray.push(1);
                }
                else {
                    valueArray.push(0)
                };
            }

            // Get some results 
            let predictions = [];
            for (let y2 = 2016; y2 <= 2018; y2++) {
                for (let m = 1; m <= 12; m++) {
                    valueArray[0] = y2;
                    valueArray[1] = m;

                    predictions.push({ year: y2, month: m, prediction: lr.predict(valueArray) })
                }
            }

            let label;
            for (let i = 0; i < labelKeys.length; i++) {
                if (cat == i)
                    label = labelKeys[i];
            }

            console.log("predictions for category " + label, JSON.stringify(predictions));

            // TODO: decodify

            // TODO: store prediction data in Predictions collection. Use rawCollection and bulk insert.
        });




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
