import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularNvd3 from 'angular-nvd3';
import uiRouter from 'angular-ui-router';

import template from './spendingGrouped.html';

class SpendingGrouped {
    constructor($scope, $reactive) {
        'ngInject';

        $scope.options = {
            chart: {
                type: 'multiBarHorizontalChart',
                height: 450,
                margin: {
                    top: 20,
                    right: 20,
                    bottom: 45,
                    left: 120
                },
                clipEdge: true,
                //staggerLabels: true,
                duration: 500,
                stacked: false,
                showControls: false,
                xAxis: {
                    axisLabel: 'Month',
                    showMaxMin: false,
                    tickFormat: function (d) {
                        // return d3.format(',f')(d);
                        var label = $scope.data[0].values[d].label;
                        return label;
                    }
                },
                yAxis: {
                    axisLabel: 'Amount',
                    axisLabelDistance: 50,
                    tickFormat: function (d) {
                        return d3.format(',.1f')(d);
                    }
                }
            }
        };

        $scope.data = generateDataSimple();
        $scope.groupField = "category";
        $scope.groupFieldDisplayName = "category";

        function generateDataSimple() {
            var values = [];
            var values0 = [];

            for (var h = 0; h < 12; h++) {
                let yVal = 10e7 * Math.random() + 1;
                let month = h + 1;
                let xLabel = ""; // "2016-" + ("00" + month).slice(-2);
                values.push({ x: h, label: xLabel, y: yVal });
                //values0.push({ x: h, label: xLabel, y: yVal * Math.random() });
            }

            return [{
                key: 'Spending for category',
                color: '#ffeead',
                values: values
            }];
        }
    }
}

const name = 'spendingGrouped';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    angularNvd3,
]).component(name, {
    template,
    controllerAs: name,
    // bindings: {
    //     filters: '<',
    //     groupField: '<'
    // },
    controller: SpendingGrouped
});