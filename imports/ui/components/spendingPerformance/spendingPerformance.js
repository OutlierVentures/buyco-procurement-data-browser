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
                    top: 20,
                    right: 20,
                    bottom: 50,
                    left: 60
                },
                color: d3.scale.category10().range(),
                //useInteractiveGuideline: true,
                duration: 500,
                xAxis: {
                    tickFormat: function (d) {
                        if (!$scope.data[0])
                            return "";
                        var label = $scope.data[0].values[d].label;
                        return label;
                    }
                },
                yAxis1: {
                    // axisLabel: 'Amount',
                    axisLabelDistance: 20,
                    tickFormat: function (d) {
                        return d3.format(',.1f')(d / 1e6) + "M";
                    }
                },
                yAxis2: {
                    tickFormat: function (d) {
                        return d;
                    }
                }
            }
        };

        var that = this;


        let performanceValues = {
            type: "line",
            key: "Children in need, per 10,000",
            yAxis: 2,
            values: [
                { x: 0, label: "2015 Q1", y: 20 },
                { x: 1, label: "2015 Q2", y: 60 },
                { x: 2, label: "2015 Q3", y: 30 },
                { x: 3, label: "2015 Q4", y: 40 }]
        };

        $scope.$on('chartRefresh', function (e, newData) {
            let spendingData = JSON.parse(JSON.stringify(newData));
            spendingData.yAxis = 1;
            spendingData.type = "bar";
            $scope.data = [
                spendingData,
                performanceValues
            ];
        });

        // Using $onInit to detect when the binding is initially set works, but not to 
        // check when it gets updated.

        // this.s = $scope;

        // this.$onInit = function ($scope) {
        //     this.s.data.push(this.spendingData);
        // }
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
    bindings: {
        organisationName: '<',
        // Using the bindings to set the chart data doesn't work very well
        // because the parent keeps resetting it.
        spendingData: '<'
    },
    controller: SpendingPerformance
});
