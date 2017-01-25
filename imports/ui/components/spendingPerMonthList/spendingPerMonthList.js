import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import utilsPagination from 'angular-utils-pagination';

import { Counts } from 'meteor/tmeasday:publish-counts';

import { SpendingPerMonth } from '../../../api/spendingPerMonth';
import { SpendingOrganisations } from '../../../api/spendingOrganisations';
import { SpendingServices } from '../../../api/spendingServices';


import template from './spendingPerMonthList.html';

class SpendingPerMonthList {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        $scope.helpers({
            spendingPerMonth: function () {
                return SpendingPerMonth.find({}, {
                    sort: $scope.getReactively('sort')
                });
            },
            spendingOrganisations: function () {
                return SpendingOrganisations.find({});
            },
            spendingServices: function () {
                return SpendingServices.find({});
            },
            chartData: function () {
                var spendingPerMonth = SpendingPerMonth.find({}, {
                    sort: $scope.getReactively('sort')
                });

                var values = [];
                var values0 = [];

                let i = 0;
                spendingPerMonth.forEach((spendThisMonth) => {
                    let xLabel = spendThisMonth.group[0] + "-" + ("00" + spendThisMonth.group[1]).slice(-2);
                    let yVal = spendThisMonth.reduction;
                    values.push({ x: i, label: xLabel, y: yVal });
                    // Set a random amount for users' spending
                    // TODO: use real values.
                    values0.push({ x: i, label: xLabel, y: yVal * Math.random() });
                    i++;
                });

                return [{
                    key: 'Total spending',
                    color: '#fdb632',
                    values: values
                }, {
                    key: 'Your BuyCo',
                    color: '#027878',
                    values: values0
                }];
            }

        });

        $scope.selectedOrganisation = "Wakefield MDC";

        $scope.subscribe('spendingOrganisations');
        $scope.subscribe('spendingServices', function () {
            return [$scope.getReactively("selectedOrganisation")];
        });

        $scope.subscribe('spendingPerMonth', function () {
            return [{
                organisation_name: $scope.getReactively("selectedOrganisation"),
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service")
            }];
        });


        $scope.chartOptions = {
            chart: {
                type: 'multiBarHorizontalChart',
                height: 600,
                margin: {
                    top: 20,
                    right: 20,
                    bottom: 80,
                    left: 60
                },
                clipEdge: true,
                //staggerLabels: true,
                duration: 500,
                stacked: false,
                showControls: false,
                xAxis: {
                    // axisLabel: 'Month',
                    // axisLabelDistance: 50,
                    showMaxMin: false,
                    tickFormat: function (d) {
                        // return d3.format(',f')(d);
                        var label = $scope.chartData[0].values[d].label;
                        return label;
                    }
                },
                yAxis: {
                    axisLabel: 'Amount',
                    axisLabelDistance: 20,
                    tickFormat: function (d) {
                        return d3.format(',.1f')(d / 1e6) + "M";
                    }
                },
                callback: function (chart) {
                    chart.multibar.dispatch.on('elementClick', function (e) {
                        console.log('The chart was clicked', e.data);
                    });
                }
            }
        };
    }
}

const name = 'spendingPerMonthList';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    utilsPagination,
]).component(name, {
    template,
    controllerAs: name,
    controller: SpendingPerMonthList
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('spending-per-month', {
            url: '/spending-per-month',
            template: '<spending-per-month-list></spending-per-month-list>'
        });
}
