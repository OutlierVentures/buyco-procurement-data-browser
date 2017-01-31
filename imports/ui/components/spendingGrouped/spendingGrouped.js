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
                    left: 50
                },
                clipEdge: true,
                //staggerLabels: true,
                duration: 500,
                stacked: false,
                showControls: false,
                xAxis: {
                    axisLabel: 'Category',
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
                        return d3.format(',.1f')(d / 1e6) + "M";
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

            let currentVal = 10e7 * Math.random() + 1;

            for (var h = 0; h < 20; h++) {
                let yVal = currentVal;
                currentVal = currentVal * (0.6 + Math.random() * 0.4);
                let xLabel = "";
                values.push({ x: h, label: xLabel, y: yVal });
                //values0.push({ x: h, label: xLabel, y: yVal * Math.random() });
            }

            return [{
                key: 'Spending for category',
                color: '#1f77b4',
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