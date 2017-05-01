import { PredictionRuns } from '/imports/api/predictionRuns';
import { Predictions } from '/imports/api/predictions';
import { Spending } from '/server/bigchaindb/spending';
import shaman from 'shaman';

export function executePredictionStep(predictionRunId) {
    if (Meteor.isServer) {
        console.log("executePredictionStep", predictionRunId);

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

        pipeLine.push({ $sort: { "_id.year": 1, "_id.month": 1, "totalAmount": -1 } })

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
        // for (let i = 0; i < 10; i++) {
        //     console.log(data[i]);
        // }

        // Prepare array-formed data for linear regression

        var X = [];
        var y = [];

        data.forEach((doc) => {
            let valueArray = [];
            // Try year and month separately. Could put in the point as date as in this example:
            // https://github.com/luccastera/shaman/blob/master/examples/stock.js
            // valueArray.push(doc.month.getFullYear());
            // valueArray.push(doc.month.getMonth());

            var period = (doc._id.year - 2010) * 12 + doc._id.month;
            //valueArray.push(doc._id.year);
            valueArray.push(period);

            // Add month as individual value, and also as 1-hot for seasonality
            valueArray.push(doc._id.month);

            // for (let i = 1; i <= 12; i++) {
            //     if (doc._id.month == i) {
            //         valueArray.push(1);
            //     }
            //     else {
            //         valueArray.push(0)
            //     };
            // }

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
        console.log(X[100].length);

        var lr = new shaman.LinearRegression(X, y,
            // { algorithm: 'GradientDescent', learningRate: 0.3, numberOfIterations: 5000, debug: true }
            { algorithm: 'NormalEquation', debug: true }
            // { algorithm: 'GradientDescent', debug: true }
        );
        lr.train(function (err) {
            if (err) { throw err; }
            let y = 2018, cat = 4;

            // Create an example value array for the predictions
            let valueArray = [];

            // period
            valueArray.push(1);

            // month
            valueArray.push(1);

            // Month as 1-hot
            // for (let m = 1; m <= 12; m++) {
            //     valueArray.push(0);
            // }

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
                    var period = (y2 - 2010) * 12 + m;
                    //valueArray.push(doc._id.year);
                    valueArray[0] = period;

                    // Add month as individual value, and also as 1-hot for seasonality
                    //valueArray.push(doc._id.month);
                    for (let i = 1; i <= 12; i++) {
                        if (m == i) {
                            valueArray[1 + i] = 1;
                        }
                        else {
                            valueArray[1 + i] = 0;
                        };
                    }
                    // valueArray[0] = y2;
                    // valueArray[1] = m;
                    console.log(valueArray.length);
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
