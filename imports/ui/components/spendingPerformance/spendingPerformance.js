import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularNvd3 from 'angular-nvd3';
import uiRouter from 'angular-ui-router';

import template from './spendingPerformance.html';

class SpendingPerformance {
    constructor($scope, $reactive) {
        'ngInject';

        $scope.dataSource = [];

        $scope.chartOptions = {
            palette: "vintage",
            dataSource: $scope.dataSource,
            commonSeriesSettings:{
                argumentField: "label",
                type: "fullstackedbar"
            },
            series: [ {
                    valueField: "spending",
                    name: "Spending",
                    color: 'rgb(255, 170, 102)',
                    type: "bar"
                }, {
                    axis: "children",
                    type: "spline",
                    valueField: "children",
                    name: "Children in need, per 10,000",
                    color: "#008fd8"
                }
            ],
            valueAxis: [{
                grid: {
                    visible: true
                },
                label: {
                    format: "largeNumber"
                }
            }, {
                    name: "children",
                    position: "right",
                    grid: {
                        visible: true
                    },
                    label: {
                        format: "largeNumber"
                    }
            }],
            tooltip: {
                enabled: true,
                shared: true,
                format: {
                    type: "largeNumber",
                    precision: 1
                },
                customizeTooltip: function (arg) {
                    var items = arg.valueText.split("\n"),
                        color = arg.point.getColor();
                    $.each(items, function(index, item) {
                        if(item.indexOf(arg.seriesName) === 0) {
                            items[index] = $("<b>")
                                            .text(item)
                                            .css("color", color)
                                            .prop("outerHTML");
                        }
                    });
                    return { text: items.join("\n") };
                }
            },
            legend: {
                verticalAlignment: "bottom",
                horizontalAlignment: "center"
            },
            "export": {
                enabled: true
            },
            size: {
                height: 400
            }
        };

        $scope.helpers({
            chartData: function () {
                $scope.chartOptions.dataSource = $scope.getReactively("dataSource");
                return $scope.chartOptions;
            }
        });

        var that = this;

        let performanceValues = {
            type: "line",
            key: "Children in need, per 10,000",
            yAxis: 2,
            color: "#1f77b4",
            values: [
                { x: 0, label: "2015 Q1", y: 407 },
                { x: 1, label: "2015 Q2", y: 353 },
                { x: 2, label: "2015 Q3", y: 291 },
                { x: 3, label: "2015 Q4", y: 175 }
            ]
        };

        $scope.$on('chartRefresh', function (e, newData) {
            let spendingData = JSON.parse(JSON.stringify(newData));
            spendingData.key = "Spending";
            spendingData.yAxis = 1;
            spendingData.type = "line";
            spendingData.values.forEach((val) => {
                delete val.series;
            });
            $scope.data = [
                spendingData,
                performanceValues
            ];

            loadSpendingPerformanceData(spendingData, performanceValues);
        });

        function loadSpendingPerformanceData(spendingValues, performanceValues) {
            $scope.dataSource = [];

            if(spendingValues.values.length) {
                if(spendingValues.values[0].label.search('Q') != -1) {
                    performanceValues.values.forEach((performanceData) => {
                        $scope.dataSource.push(
                        {
                            label : performanceData.label,
                            children : performanceData.y
                        });
                    });
                }

                spendingValues.values.forEach((spendingData) => {
                    $scope.dataSource.push(
                    {
                        label : spendingData.label,
                        spending : spendingData.y
                    });
                });
            }
        }
    }
}

const name = 'spendingPerformance';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    angularNvd3
]).component(name, {
    template,
    controllerAs: name,
    bindings: {
        organisationName: '<'
        // Using the bindings to set the chart data doesn't work very well
        // because the parent keeps resetting it.
        // spendingData: '<'
    },
    controller: SpendingPerformance
});
