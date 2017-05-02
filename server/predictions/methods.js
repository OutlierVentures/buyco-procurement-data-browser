import { PredictionRuns } from '/imports/api/predictionRuns';
import { Predictions } from '/imports/api/predictions';
import { Spending } from '/server/bigchaindb/spending';
import shaman from 'shaman';

export function executePredictionStep(predictionRunId) {
    if (Meteor.isServer) {
        console.log("executePredictionStep", predictionRunId);

        // Unblock immediately
        this.unblock();

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
            let textValue = doc._id[groupField];

            let labelIndex = labels[textValue];
            if (labelIndex === undefined) {
                // This label wasn't in the label dictionary yet, add it.
                labelIndex = Object.keys(labels).length;
                labels[textValue] = labelIndex;
            }

            doc.label = labelIndex;
            data.push(doc);
        });

        console.log("data length after forEach", data.length);
        console.log("labels", JSON.stringify(labels));

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
            // Period value
            valueArray.push(period);

            // Add month as individual value
            // valueArray.push(doc._id.month);

            // Month as 1-hot encoding
            for (let i = 1; i <= 12; i++) {
                if (doc._id.month == i) {
                    valueArray.push(1);
                }
                else {
                    valueArray.push(0)
                };
            }

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

        let exampleItem = X[100];
        console.log("example from X array", JSON.stringify(exampleItem));
        console.log("X item length", exampleItem.length);

        // Debug: find example values for specific category
        let exampleCatName = "Children and Young People";

        // let historicalData = _(data).filter((dataPoint) => {
        //     return dataPoint._id[groupField] == exampleCatName;
        // });

        // console.log("historical data", JSON.stringify(historicalData));

        var lr = new shaman.LinearRegression(X, y,
            // { algorithm: 'GradientDescent', learningRate: 0.3, numberOfIterations: 5000, debug: true }
            { algorithm: 'NormalEquation', debug: true }
            // { algorithm: 'GradientDescent', debug: true }
        );
        lr.train(function (err) {
            if (err) { throw err; }
            let y = 2018;

            let catIndex = labels[exampleCatName];
            console.log("Category index", catIndex);

            // Create an example value array for the predictions
            let valueArray = [];

            // Dummy values for time-based parameters. We fill in the real values in the loop below.
            // Period
            valueArray.push(1);

            // Month as value
            // valueArray.push(1);

            // Month as 1-hot encoding
            for (let m = 1; m <= 12; m++) {
                valueArray.push(0);
            }

            let desiredLabel = catIndex;
            let labelKeys = Object.keys(labels);

            // Category as 1-hot encoding
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
            for (let y2 = 2013; y2 <= 2018; y2++) {
                for (let m = 1; m <= 12; m++) {
                    var period = (y2 - 2010) * 12 + m;
                    //valueArray.push(doc._id.year);
                    valueArray[0] = period;

                    // Add month as individual value
                    //valueArray.push(doc._id.month);

                    // Month as 1-hot encoding
                    for (let i = 1; i <= 12; i++) {
                        if (m == i) {
                            valueArray[i] = 1;
                        }
                        else {
                            valueArray[i] = 0;
                        };
                    }
                    // valueArray[0] = y2;
                    // valueArray[1] = m;

                    if (y2 == 2016 && m == 1) {
                        // Log example item for debugging
                        console.log("prediction valueArray length", valueArray.length);
                        console.log("prediction valueArray", JSON.stringify(valueArray));
                    }

                    let predictionPoint = {
                        year: y2, month: m, prediction: lr.predict(valueArray)
                    };

                    // Find historical value for matching points
                    let histVal = _(data).find((dataPoint) => {
                        return dataPoint._id.year == y2 && dataPoint._id.month == m && dataPoint._id[groupField] == exampleCatName;
                    });

                    if (histVal) {
                        predictionPoint.historical_value = histVal.totalAmount;
                    }

                    predictions.push(predictionPoint);
                }
            }

            console.log()

            let label;
            for (let i = 0; i < labelKeys.length; i++) {
                if (catIndex == i)
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
