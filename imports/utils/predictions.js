import regression from 'regression';


/**
 * Compute a linear regression line for the given spending data.
 * Only compatible with period == 'quarter'.
 * 
 * @return array with regression values.
 */
export function getRegressionLine(spendingData) {
    if (spendingData.length == 0)
        return { points: [] };

    // Convert to an array of type [ [x1, y1], [x2, y2], ..., [xN, yN] ].
    let data = [];

    for (let i = 0; i < spendingData.length; i++) {
        let spendingPoint = spendingData[i];
        data.push([i, spendingPoint.totalAmount]);
    }

    let result = regression('linear', data);
    // let result = regression('polynomial', data, 2);

    let slope = result.equation[0];
    let yIntercept = result.equation[1];

    // Calculate trend value for each point
    let resultData = [];

    for (let i = 0; i < spendingData.length; i++) {
        let spendingPoint = spendingData[i];

        let regressionPoint = {
            _group: spendingPoint._group,
            totalAmount: result.points[i][1]
        }
        resultData.push(regressionPoint);
    }

    // Add future points

    // The regression package creates a string that's /almost/ valid Javascript, but not
    // quite. Add '*' to allow eval()'ing it.
    var evaluatableFormula = result.string.replace(/x/g, ' * x');

    for (let i = 0; i < 8; i++) {
        let timeIndex = i + spendingData.length;

        let quarter = i % 4 + 1;
        let year = 2017 + Math.floor((i) / 4);

        var x = timeIndex;

        let regressionValue = eval(evaluatableFormula);

        let regressionPoint = {
            _group: {
                year: year,
                quarter: quarter
            },
            totalAmount: regressionValue
        }

        resultData.push(regressionPoint);
    }

    return {
        points: resultData,
        parameters: {
            intercept: yIntercept,
            slope: slope
        }

    };
}