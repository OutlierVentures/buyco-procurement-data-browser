import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularNvd3 from 'angular-nvd3';
import uiRouter from 'angular-ui-router';

import template from './spendingPerformance.html';

class SpendingPerformance {
    constructor($scope, $reactive) {
        'ngInject';

        $scope.options = {
            chart: {
                type: 'multiChart',
                height: 450,
                margin: {
                    top: 30,
                    right: 60,
                    bottom: 50,
                    left: 70
                },
                color: d3.scale.category10().range(),
                //useInteractiveGuideline: true,
                duration: 500,
                xAxis: {
                    tickFormat: function (d) {
                        var label = $scope.data[0].values[d].label;                                                
                        return label;
                    }
                },
                yAxis1: {
                    tickFormat: function (d) {
                        return d3.format(',.1f')(d);
                    }
                },
                yAxis2: {
                    tickFormat: function (d) {
                        return d3.format(',.1f')(d);
                    }
                }
            }
        };

        $scope.helpers({
            data: function () {
                return [
                    {
                        type: "bar",
                        key: "Spending",
                        yAxis: 1,
                        values: [
                            { x: 0, label: "2015 Q1", y: 100 },
                            { x: 1, label: "2015 Q2", y: 150 },
                            { x: 2, label: "2015 Q3", y: 50 },
                            { x: 3, label: "2015 Q4", y: 60 }]
                    },
                    {
                        type: "line",
                        key: "Children in need, per 10,000",
                        yAxis: 2,
                        values: [
                            { x: 0, label: "2015 Q1", y: 20 },
                            { x: 1, label: "2015 Q2", y: 60 },
                            { x: 2, label: "2015 Q3", y: 30 },
                            { x: 3, label: "2015 Q4", y: 40 }]
                    }

                ]
            }
        });

    }
}

const name = 'spendingPerformance';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    angularNvd3,
]).component(name, {
    template,
    controllerAs: name,
    controller: SpendingPerformance
});
