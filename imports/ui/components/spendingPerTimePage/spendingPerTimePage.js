import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import utilsPagination from 'angular-utils-pagination';

import { Counts } from 'meteor/tmeasday:publish-counts';

import { SpendingPerTime } from '../../../api/spendingPerTime';
import { ClientSpendingPerTime } from '../../../api/clientSpendingPerTime';
import { SpendingOrganisations } from '../../../api/spendingOrganisations';
import { SpendingServices } from '../../../api/spendingServices';
import { SpendingCategories } from '../../../api/spendingCategories';


import template from './spendingPerTimePage.html';

class SpendingPerTimePage {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        $scope.helpers({
            spendingPerTime: function () {
                return SpendingPerTime.find({});
            },
            clientSpendingPerTime: function () {
                return ClientSpendingPerTime.find({});
            },
            mergedSpendingPerTime: function () {
                // Prepare a joined collection with the percentage of client trade.
                // TODO: this is business logic, move it to an API function.
                var ps = SpendingPerTime.find({});
                var cs = ClientSpendingPerTime.find({});

                var merged = [];
                ps.forEach((spendThisPeriod) => {
                    let mergedItem = spendThisPeriod;
                    merged.push(mergedItem);

                    cs.forEach((clientSpendThisPeriod) => {
                        if (clientSpendThisPeriod.group[0] == spendThisPeriod.group[0]
                            && clientSpendThisPeriod.group[1] == spendThisPeriod.group[1]) {

                            mergedItem.client_amount_net = clientSpendThisPeriod.reduction;
                            mergedItem.client_amount_net_percent = clientSpendThisPeriod.reduction / spendThisPeriod.reduction * 100;
                        }
                    });

                });

                return merged;
            },
            spendingOrganisations: function () {
                return SpendingOrganisations.find({});
            },
            spendingServices: function () {
                return SpendingServices.find({});
            },
            spendingCategories: function () {
                return SpendingCategories.find({});
            },
            chartData: function () {
                var spendingPerTime = SpendingPerTime.find({}, {
                });

                var clientSpendingPerTime = ClientSpendingPerTime.find({}, {
                });

                var publicValues = [];
                var clientValues = [];

                let i = 0;
                spendingPerTime.forEach((spendThisPeriod) => {
                    let xLabel = spendThisPeriod.group[0] + "-" + ("00" + spendThisPeriod.group[1]).slice(-2);
                    let yVal = spendThisPeriod.reduction;
                    publicValues.push({ x: i, label: xLabel, y: yVal, source: spendThisPeriod });

                    // Find corresponding item in client spending
                    clientSpendingPerTime.forEach((clientSpendThisPeriod) => {
                        if (clientSpendThisPeriod.group[0] == spendThisPeriod.group[0]
                            && clientSpendThisPeriod.group[1] == spendThisPeriod.group[1]) {
                            clientValues.push({ x: i, label: xLabel, y: clientSpendThisPeriod.reduction, source: clientSpendThisPeriod });
                        }
                    });

                    i++;
                });

                return [{
                    key: 'Total spending',
                    color: '#fdb632',
                    values: publicValues
                }, {
                    key: 'Your BuyCo',
                    color: '#027878',
                    values: clientValues
                }];
            }

        });

        // UX defaults on component open
        $scope.detailsVisible = true;
        $scope.period = "quarter";
        $scope.selectedOrganisation = "Wakefield MDC";

        $scope.subscribe('spendingOrganisations');
        $scope.subscribe('spendingServices', function () {
            return [$scope.getReactively("selectedOrganisation")];
        });
        $scope.subscribe('spendingCategories', function () {
            return [$scope.getReactively("selectedOrganisation")];
        });

        $scope.subscribe('spendingPerTime', function () {
            return [{
                organisation_name: $scope.getReactively("selectedOrganisation"),
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service")
            },
            {
                period: $scope.getReactively("period")
            }];
        });

        $scope.subscribe('clientSpendingPerTime', function () {
            return [{
                organisation_name: $scope.getReactively("selectedOrganisation"),
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service")
            },
            {
                period: $scope.getReactively("period")
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

const name = 'spendingPerTimePage';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    utilsPagination,
]).component(name, {
    template,
    controllerAs: name,
    controller: SpendingPerTimePage
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('spending-per-time', {
            url: '/spending/time',
            template: '<spending-per-time-page></spending-per-time-page>'
        });
}
