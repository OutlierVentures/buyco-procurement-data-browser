import { PredictionRuns } from '/imports/api/predictionRuns';
import { Predictions } from '/imports/api/predictions';
import { Spending } from '/server/bigchaindb/spending';
import shaman from 'shaman';

let debug = true;

export function executePredictionStep(predictionRunId) {
    if (Meteor.isServer) {
        if (debug) console.log("executePredictionStep", predictionRunId);

        if (predictionRunId._str)
            predictionRunId = predictionRunId._str;

        // TODO: take organisation name as parameter; run for all organisations
        let organisationName = "Wakefield MDC";

        // Unblock immediately
        this.unblock();

        // Load data for all councils, all time
        let data = [];

        let groupField = "procurement_classification_1";

        let pipeLine = [];

        pipeLine.push({ $match: { organisation_name: organisationName } });
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

        // Sort the data by date. Not necessary for the ML, but helpful when inspecting it.
        pipeLine.push({ $sort: { "_id.year": 1, "_id.month": 1, "totalAmount": -1 } })

        if (debug) console.log("pipeLine", JSON.stringify(pipeLine));
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

        if (debug) console.log("data length after forEach", data.length);
        if (debug) console.log("labels", JSON.stringify(labels));

        // Log some source data for debugging
        // for (let i = 0; i < 10; i++) {
        //     if(debug) console.log(data[i]);
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

            var period = computePeriod(doc._id.year, doc._id.month);

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

        if (debug) console.log("X length", X.length);
        if (debug) console.log("y length", y.length);        

        let exampleItem = X[100];
        if (debug) console.log("example from X array", JSON.stringify(exampleItem));
        if (debug) console.log("X item length", exampleItem.length);

        // Debug: find example values for specific category
        let exampleCatName = "Children and Young People";

        var lr = new shaman.LinearRegression(X, y,
            // { algorithm: 'GradientDescent', learningRate: 0.3, numberOfIterations: 5000, debug: true }
            { algorithm: 'NormalEquation', debug: true }
            // { algorithm: 'GradientDescent', debug: true }
        );
        lr.train(function (err) {
            if (err) { throw err; }

            if (debug) {
                console.log("Training complete");
                console.log("theta", JSON.stringify(lr.theta));
            }

            // Create an example value array for the predictions
            let valueArray = [];

            // Dummy values for time-based parameters. We fill in the real values in the loop below.
            // Period
            valueArray.push(0);

            // Month as 1-hot encoding
            for (let m = 1; m <= 12; m++) {
                valueArray.push(0);
            }

            // let catIndex = 1;
            // let desiredLabel = catIndex;

            let labelKeys = Object.keys(labels);

            // Category as 1-hot encoding
            for (let i = 0; i < labelKeys.length; i++) {
                valueArray.push(0)
            }

            // Get predictions for all categories, 3 years in future
            let predictions = [];
            for (let labelIndex = 0; labelIndex < labelKeys.length; labelIndex++) {
                let labelText = labelKeys[labelIndex];

                // Category as 1-hot encoding
                let catIndexOffset = 13;
                for (let i = 0; i < labelKeys.length; i++) {
                    if (labelIndex == i) {
                        valueArray[catIndexOffset + i] = 1;
                    }
                    else {
                        valueArray[catIndexOffset + i] = 0;
                    };
                }

                for (let y = 2014; y <= 2018; y++) {
                    for (let m = 1; m <= 12; m++) {
                        var period = computePeriod(y, m);
                        valueArray[0] = period;

                        // Month as 1-hot encoding
                        for (let i = 1; i <= 12; i++) {
                            if (m == i) {
                                valueArray[i] = 1;
                            }
                            else {
                                valueArray[i] = 0;
                            };
                        }

                        if (debug) {
                            if (y == 2016 && m == 1 && labelText == exampleCatName) {
                                // Log example item for debugging
                                console.log("prediction valueArray length", valueArray.length);
                                console.log("prediction valueArray", JSON.stringify(valueArray));
                            }
                        }

                        let predictionValue = lr.predict(valueArray);

                        let predictionPoint = {
                            year: y, month: m, amount_net: Math.max(predictionValue, 0)
                        };

                        // Find historical value for matching points
                        if (debug) {
                            let histVal = _(data).find((dataPoint) => {
                                return dataPoint._id.year == y && dataPoint._id.month == m && dataPoint._id[groupField] == labelText;
                            });

                            if (histVal) {
                                predictionPoint.historical_value = histVal.totalAmount;
                            }
                        }

                        predictionPoint.organisation_name = organisationName;
                        predictionPoint.prediction_run_id = predictionRunId;
                        predictionPoint.group_field = groupField;

                        // Decodify group value
                        predictionPoint.group_value = labelText;

                        predictionPoint.effective_date = new Date(y, m - 1, 1);

                        predictions.push(predictionPoint);
                    }
                }
            }

            if (debug) console.log("first 100 predictions", JSON.stringify(_(predictions).head(100)));

            if (debug) {
                let examplePredictions = _(predictions).filter((p) => { return p.group_value == exampleCatName });
                console.log("Example predictions", JSON.stringify(examplePredictions));
            }

            // Store prediction data in Predictions collection.
            // Delete any previous data for this run
            Predictions.remove({ prediction_run_id: predictionRunId });

            // Use rawCollection and bulk insert because we'll be doing many inserts at once.
            const predictionsRaw = Predictions.rawCollection()

            const timer = Date.now();
            const bulkInsertOp = predictionsRaw.initializeUnorderedBulkOp();
            bulkInsertOp.executeAsync = Meteor.wrapAsync(bulkInsertOp.execute);

            predictions.forEach((p) => {
                bulkInsertOp.insert(Object.assign({}, p));
            });
            bulkInsertOp.executeAsync();

            console.log(`Insert completed in ${Date.now() - timer}ms`);
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


/**
 * Compute a period value as used in predictions.
 */
function computePeriod(year, month) {
    return (year - 2010) * 12 + month;
}


Meteor.methods({
    executePredictionStep
});
