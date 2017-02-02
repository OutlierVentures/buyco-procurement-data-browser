import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularNvd3 from 'angular-nvd3';
import uiRouter from 'angular-ui-router';

import template from './spendingGroupedChart.html';

import { SpendingGrouped } from '../../../api/spendingGrouped';
import { MetaDataHelper } from '../../../utils';

class SpendingGroupedChart {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        $scope.helpers({
            isLoggedIn: function () {
                return Meteor.userId() != null;
            },
            groupDisplayName: () => {
                return MetaDataHelper.getFieldDisplayName("public_spending", this.getReactively("groupField"));
            },
            spendingGrouped: function () {
                return SpendingGrouped.find({});
            },
            chartData: () => {
                var spendingGrouped = SpendingGrouped.find({}, {
                });

                var publicValues = [];

                let i = 0;
                spendingGrouped.forEach((spendThisGroup) => {
                    let xLabel;

                    // For grouped data, the data will look like this:
                    // {
                    //     "group": "CAPITAL PROGRAMME HRA",
                    //     "reduction": 59610752.69999999
                    // }
                    // For the label we just use the "group" field
                    xLabel = spendThisGroup.group;

                    let yVal = spendThisGroup.reduction;
                    publicValues.push({ x: i, label: xLabel, y: yVal, source: spendThisGroup });

                    i++;
                });

                $scope.publicSpendingData = {
                    key: this.getReactively("filters.organisation_name"),
                    color: '#1f77b4',
                    values: publicValues
                };

                $scope.$broadcast('chartRefresh', $scope.publicSpendingData);

                let dataSeries = [$scope.publicSpendingData];

                return dataSeries;
            }

        });

        $scope.chartOptions = {
            chart: {
                type: 'multiBarHorizontalChart',
                height: 450,
                margin: {
                    top: 20,
                    right: 20,
                    bottom: 45,
                    // We leave a lot of space on the left to show group values (e.g. category names, supplier names etc)
                    left: 250
                },
                clipEdge: true,
                //staggerLabels: true,
                duration: 500,
                stacked: false,
                showControls: false,
                showValues: false,
                xAxis: {
                    axisLabel: '',
                    showMaxMin: false,
                    tickFormat: function (d) {
                        if (!$scope.chartData || !$scope.chartData[0])
                            return;
                        var label = $scope.chartData[0].values[d].label;
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

        // The subscribe triggers calls to the spendingGroup collection when any of the bound values
        // change. On initialisation, the values are empty and a call is executed anyway. This is handled
        // on the server: if groupField is empty, no data will be returned.
        $scope.subscribe('spendingGrouped', () => {
            return [{
                organisation_name: this.getReactively("filters.organisation_name"),
                procurement_classification_1: this.getReactively("filters.procurement_classification_1"),
                sercop_service: this.getReactively("filters.sercop_service")
            },
            {
                groupField: this.getReactively("groupField")
            }];
        });

        this.$onChanges = function () {
            console.log("spendingGroupedChart.$onChanges")
            console.log(this);
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
    bindings: {
        // Filters should contain field names to match as equal.
        filters: '<',
        // The field to group by. Valid values: procurement_classification_1, supplier_name, sercop_service.
        groupField: '<'
    },
    controller: SpendingGroupedChart
});