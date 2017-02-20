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
import { Clients } from '../../../api/clients';

import { name as SpendingGroupedChart } from '../spendingGroupedChart/spendingGroupedChart';
import { name as SpendingPerformance } from '../spendingPerformance/spendingPerformance';

import template from './spendingPerTimePage.html';

class SpendingPerTimePage {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        var that = this;
        $scope.dataSource = [];

        var start = moment().subtract(1, 'year').startOf('year');
        var end = moment();
        lastYearLabel = 'Last Year (' + moment().subtract(1, 'year').startOf('year').year() + ')';
        yearBeforeLabel = 'Year Before Last (' + moment().subtract(2, 'year').startOf('year').year() + ')';

        $scope.ranges = {
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            [lastYearLabel]: [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
            [yearBeforeLabel]: [moment().subtract(2, 'year').startOf('year'), moment().subtract(2, 'year').endOf('year')],
            'This Year': [moment().startOf('year'), moment().endOf('year')]
        };

        $scope.filterDate = {
            startDate: start,
            endDate: end
        };

        $scope.selectedPeriod = {
            startDate: start,
            endDate: end
        };

        $scope.filterName = '';

        $scope.helpers({
            isLoggedIn: function () {
                return Meteor.userId() != null;
            },
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

                var totalValues = {
                    total: 0,
                    client_amount_net: 0,
                    client_amount_net_percent: 0
                };

                var merged = [];
                ps.forEach((spendThisPeriod) => {
                    let mergedItem = spendThisPeriod;
                    totalValues.total += mergedItem.totalAmount;
                    merged.push(mergedItem);

                    cs.forEach((clientSpendThisPeriod) => {
                        if (clientSpendThisPeriod._group.year == spendThisPeriod._group.year
                            && clientSpendThisPeriod._group[$scope.period] == spendThisPeriod._group[$scope.period]) {

                            mergedItem.client_amount_net = clientSpendThisPeriod.totalAmount;
                            mergedItem.client_amount_net_percent = clientSpendThisPeriod.totalAmount / spendThisPeriod.totalAmount * 100;
                            totalValues.client_amount_net += mergedItem.client_amount_net;
                        }
                    });
                });

                if(totalValues.client_amount_net != 0) {
                    totalValues.client_amount_net_percent = totalValues.client_amount_net / totalValues.total * 100;
                }

                var mergedData = {
                    totalValues: totalValues,
                    merged: merged
                }

                return mergedData;
            },
            firstClient: function () {
                var cs = $scope.getReactively('clients');
                if (cs && cs.length > 0)
                    return cs[0];
                return null;
            },
            clients: function () {
                return Clients.find({});
            },
            spendingOrganisations: function () {
                return SpendingOrganisations.find({});
            },
            spendingServices: function () {
                return SpendingServices.find({
                    organisation_name: $scope.getReactively("selectedOrganisation")
                });
            },
            spendingCategories: function () {
                return SpendingCategories.find({
                    organisation_name: $scope.getReactively("selectedOrganisation")
                });
            },
            selectedPeriod: function () {
                $scope.filterName = $scope.filterDate.startDate.toDate().toDateString() + '-' + $scope.filterDate.endDate.toDate().toDateString();
                return $scope.getReactively("filterDate");
            },
            filterPeriodName: function () {
                return $scope.getReactively("filterName");
            },
            chartData: function () {
                var spendingPerTime = $scope.getReactively("spendingPerTime");

                var allowedClients = $scope.getReactively("clients");

                var clientSpendingPerTime = $scope.getReactively("clientSpendingPerTime");

                var publicValues = [];

                let i = 0;
                let sourceValues = [];
                spendingPerTime.forEach((spendThisPeriod) => {
                    let xLabel;
                    if ($scope.period == "quarter")
                        // "2016 Q2"
                        xLabel = spendThisPeriod._group.year + " Q" + spendThisPeriod._group.quarter;
                    else
                        // E.g. "2016-05" for May 2016
                        xLabel = spendThisPeriod._group.year + "-" + ("00" + spendThisPeriod._group.month).slice(-2);
                    let yVal = spendThisPeriod.totalAmount;
                    publicValues.push({ x: i, label: xLabel, y: yVal, source: spendThisPeriod });
                    dataPoint = { xAxis: xLabel, yAxis: yVal };

                    let clientVal = _(clientSpendingPerTime).find((v) => {
                        return v._group
                            && v._group.year == spendThisPeriod._group.year
                            && v._group[$scope.period] === spendThisPeriod._group[$scope.period];
                    });

                    if (clientVal !== undefined)
                        dataPoint.clientValue = clientVal.totalAmount;

                    sourceValues.push(dataPoint);
                    i++;
                });

                $scope.publicSpendingData = {
                    key: $scope.selectedOrganisation,
                    color: '#404040',
                    values: publicValues
                };

                let series = [{
                    argumentField: "xAxis",
                    valueField: "yAxis",
                    name: $scope.selectedOrganisation,
                    type: "bar",
                    color: '#ffaa66'
                }];

                let sc = $scope.getReactively("selectedClient");

                // Add client series if we have data for it
                if (allowedClients.length > 0 && sc) {
                    series.push({
                        argumentField: "xAxis",
                        valueField: "clientValue",
                        name: sc.name,
                        type: "bar",
                        color: '#543996'
                    })
                }

                $scope.$broadcast('chartRefresh', $scope.publicSpendingData);
                let selectedArgument = 0;

                const options =
                    {
                        dataSource: sourceValues,
                        series: series,
                        valueAxis: [{
                            label: {
                                format: "largeNumber"
                            }
                        }],
                        legend: {
                            verticalAlignment: "bottom",
                            horizontalAlignment: "center"
                        },
                        onPointClick: function(e) {
                            var target = e.target;
                            target.select();
                            selectedArgument = target.originalArgument;
                            filterPeriod(selectedArgument);
                        }
                    };

                return options;
            },
            /**
             * Filter fields to pass to the sub charts. This variable is bound by the sub chart
             * component in the template.
             */
            subChartFilters: () => {
                $scope.filterName = '';
                $scope.selectedPeriod = '';
                return {
                    organisation_name: $scope.getReactively("selectedOrganisation"),
                    procurement_classification_1: $scope.getReactively("category"),
                    sercop_service: $scope.getReactively("service"),
                    period: $scope.getReactively("period")
                };
            }
        });

        // UX defaults on component open

        // Show details and drilldown by default. If we start them as collapsed, nvd3 initialises their
        // charts only several pixels wide and doesn't correct when uncollapsed.
        $scope.detailsVisible = true;
        $scope.drillDownVisible = true;
        $scope.performanceIndicatorsVisible = true;
        $scope.period = "quarter";

        // TODO: remove this hardcoded default option, just use the first item in the list
        $scope.selectedOrganisation = "Wakefield MDC";

        function filterPeriod(period) {
            let selectedYear;
            let selectedMonth;
            var index = 0;
            var startDate, endDate;
            $scope.filterName = period;

            if($scope.period === 'quarter') {
                index = period.search('Q');
                selectedYear = period.substring(0, index - 1);
                selectedMonth = period.substring(index + 1) * 3;
                startDate = selectedYear + '-' + (selectedMonth - 2) + '-01';
                endDate = selectedYear + '-' + (selectedMonth) + '-31';
            } else { // if month
                index = period.search('-');
                selectedYear = period.substring(0, index);
                selectedMonth = period.substring(index + 1);
                selectedMonth = Number(selectedMonth);
                startDate = selectedYear + '-' + selectedMonth + '-01';
                endDate = selectedYear + '-' + (selectedMonth) + '-31';
            }

            $scope.selectedPeriod = {
                startDate: moment(new Date(startDate)), 
                endDate: moment(new Date(endDate))
            };
        }

        let clientSub = $scope.subscribe('clients');
        $scope.subscribe('spendingOrganisations');
        $scope.subscribe('spendingServices', function () {
            return [{
                organisation_name: $scope.getReactively("selectedOrganisation")
            }];
        });
        $scope.subscribe('spendingCategories', function () {
            return [{
                organisation_name: $scope.getReactively("selectedOrganisation")
            }];
        });

        $scope.subscribe('spendingPerTime', function () {
            $scope.filterName = '';
            return [{
                organisation_name: $scope.getReactively("selectedOrganisation"),
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service"),
                // Use  `payment_date` for filter and group rather than `effective_date` even though
                // the latter might be the correct one.
                // TODO: do more data analysis/wrangling to get `effective_date` right and start using that.
                payment_date: { $gt: $scope.getReactively("filterDate").startDate.toDate(), $lt: $scope.getReactively("filterDate").endDate.toDate() }
            },
            {
                period: $scope.getReactively("period")
            }];
        });

        $scope.subscribe('clientSpendingPerTime', function () {
            $scope.filterName = '';
            return [{
                client_id: $scope.getReactively("selectedClient.client_id"),
                organisation_name: $scope.getReactively("selectedOrganisation"),
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service"),
                payment_date: { $gt: $scope.getReactively("filterDate").startDate.toDate(), $lt: $scope.getReactively("filterDate").endDate.toDate() }
            },
            {
                period: $scope.getReactively("period")
            }];
        });

        this.autorun(() => {
            // Select the first client option by default when the subscription is ready.
            if (clientSub.ready()) {
                $scope.filterName = '';
                $scope.selectedClient = $scope.getReactively("firstClient");
            }
        });
    }
}

const name = 'spendingPerTimePage';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    utilsPagination,
    SpendingGroupedChart,
    SpendingPerformance
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
