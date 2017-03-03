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

import { CHART_FONT } from '../../stylesheet/config';

import template from './spendingPerTimePage.html';

class SpendingPerTimePage {
    constructor($scope, $reactive, $rootScope) {
        'ngInject';

        $rootScope.$on('resizeRequested', function (e) {
            // A page resize has been requested by another component. The chart object
            // needs to re-render to properly size.

            // Has the chart been initialised? https://www.devexpress.com/Support/Center/Question/Details/T187799
            var chartComponent = $('#timeChart');
            if (!chartComponent.data("dxChart"))
                return;

            // Re-render the chart. This will correctly resize for the new size of the surrounding
            // div.
            var timeChart = chartComponent.dxChart('instance');
            timeChart.render();
        });

        $reactive(this).attach($scope);

        var that = this;

        var start = moment().subtract(1, 'year').startOf('year');
        var end = moment();
        lastYearLabel = 'Last Year (' + moment().subtract(1, 'year').startOf('year').year() + ')';
        lastTwoYearsLabel = 'Last Two Years (' + moment().subtract(2, 'year').startOf('year').year() + '-' + moment().subtract(1, 'year').startOf('year').year() + ')';
        yearBeforeLabel = 'Year Before Last (' + moment().subtract(2, 'year').startOf('year').year() + ')';

        $scope.selectedOrganisation = [];
        $scope.filteredOrganisations = [];
        $scope.organisationCount = 0;
        $scope.organisationSettings = {
            scrollableHeight: '200px',
            scrollable: true,
            enableSearch: false,
            externalIdProp: "id",
            showUncheckAll: false,
            selectionLimit: $scope.organisationCount
        };
        $scope.organisationEventSetting = {
            onSelectAll: selectAllOrganisation,
            onMaxSelectionReached: reachedMaxSelection
        };

        $scope.ranges = {
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            [lastYearLabel]: [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
            [lastTwoYearsLabel]: [moment().subtract(2, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
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
                    mergedItem.client_amount_net = 0;

                    cs.forEach((clientSpendThisPeriod) => {
                        if (clientSpendThisPeriod._group.organisation_name == spendThisPeriod._group.organisation_name && clientSpendThisPeriod._group.year == spendThisPeriod._group.year
                            && clientSpendThisPeriod._group[$scope.period] == spendThisPeriod._group[$scope.period]) {
                            mergedItem.client_amount_net += clientSpendThisPeriod.totalAmount;
                            mergedItem.client_amount_net_percent = mergedItem.client_amount_net / spendThisPeriod.totalAmount * 100;
                        }
                    });
                    totalValues.client_amount_net += mergedItem.client_amount_net;
                });

                if (totalValues.client_amount_net != 0) {
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
                var organisationsBuffer = [];
                var organisations = SpendingOrganisations.find({});
                organisations.forEach((organisation) => {
                    organisationsBuffer.push({
                        id: organisation._id,
                        label: organisation.organisation_name
                    });

                    $scope.selectedOrganisation = [{
                        id: organisation._id
                    }];
                });
                $scope.organisationCount = organisationsBuffer.length;
                return organisationsBuffer;
            },
            spendingServices: function () {
                return SpendingServices.find({
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") }
                });
            },
            spendingCategories: function () {
                return SpendingCategories.find({
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") }
                });
            },
            selectedPeriod: function () {
                return $scope.getReactively("filterDate");
            },
            filterPeriodName: function () {
                return $scope.getReactively("filterName");
            },
            chartData: function () {
                var spendingPerTime = $scope.getReactively("spendingPerTime");
                var allowedClients = $scope.getReactively("clients");
                var mergedSpendingPerTime = $scope.getReactively("mergedSpendingPerTime");
                var publicValues = [];
                let i = 0;

                let pointsByPeriod = [];

                // The grouped records look like this:
                // { _group: { year: 2016, quarter: "2016 Q1", organisation_name: "Some Council"}, totalAmount: 12345},
                // { _group: { year: 2016, quarter: "2016 Q1", organisation_name: "Another Council"}, totalAmount: 54321},
                // ...
                // Furthermore we might have clientData which has the same structure.
                // We loop through them and create points like this:
                // {
                //      "xAxis": "2016 Q1"
                //      "Some Council": 12345,
                //      "Another Council": 54321,
                //      "clientValue_Some Council": 1234,
                //      "clientValue_Another Council": 4321
                // }

                mergedSpendingPerTime.merged.forEach((unit) => {
                    let xLabel;
                    if ($scope.period == "quarter")
                        // "2016 Q2"
                        xLabel = unit._group.year + " Q" + unit._group.quarter;
                    else
                        // E.g. "2016-05" for May 2016
                        xLabel = unit._group.year + "-" + ("00" + unit._group.month).slice(-2);

                    let dataPoint = pointsByPeriod[xLabel];
                    if (!dataPoint) {
                        dataPoint = { xAxis: xLabel };
                        pointsByPeriod[xLabel] = dataPoint;
                    }

                    let amount = unit.totalAmount;
                    dataPoint[unit._group.organisation_name] = amount;

                    let clientVal = unit.client_amount_net;

                    if (clientVal !== undefined) {
                        let clientPointKey = "clientValue_" + unit._group.organisation_name;
                        dataPoint[clientPointKey] = clientVal;
                    }

                    // Fill tabular data. Only works for a single organisation.
                    if ($scope.selectedOrganisation.length == 1)
                        publicValues.push({ x: i, label: xLabel, y: amount, source: unit });
                });

                // pointsByPeriod looks like this: [ "2016 Q1": {...}, "2016 Q2": {...}] with {...} being data points.
                // dxCharts wants a numeric array.
                let sourceValues = _.values(pointsByPeriod);

                $scope.publicSpendingData = {
                    key: $scope.selectedOrganisation,
                    color: '#404040',
                    values: publicValues
                };

                let series = [];

                let sc = $scope.getReactively("selectedClient");

                // Create series for each selected organisation, and if client data is shown,
                // another series for client data for each organisation.
                _($scope.selectedOrganisation).each((org) => {
                    series.push({
                        argumentField: "xAxis",
                        valueField: org.id,
                        name: org.id,
                        type: "bar",
                        color: getColor(org.id)
                    });

                    // Add client series if we have data for it
                    if (allowedClients.length > 0 && sc) {
                        series.push({
                            argumentField: "xAxis",
                            valueField: "clientValue_" + org.id,
                            name: sc.name + " - " + org.id,
                            type: "bar",
                            color: '#543996'
                        })
                    }

                });

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
                        onPointClick: function (e) {
                            var target = e.target;
                            if (!target.isSelected()) {
                                target.select();
                                selectedArgument = target.originalArgument;
                                filterPeriod(selectedArgument);
                            } else {
                                target.clearSelection();
                                filterPeriod(null);
                            }
                        },
                        tooltip: {
                            enabled: true,
                            shared: true,
                            format: {
                                type: "largeNumber",
                                precision: 1
                            },
                            customizeTooltip: function (arg) {
                                let newValue = abbreviate_number(arg.value, 0);
                                let items = (arg.seriesName + " - " + arg.argumentText + " - " + newValue).split("\n"), color = arg.point.getColor();
                                let tempItem = '';
                                tempItem += items;
                                $.each(items, function (index, item) {
                                    items[index] = $("<b>")
                                        .text(tempItem)
                                        .css("color", color)
                                        .prop("outerHTML");
                                });
                                return { text: items.join("\n") };
                            }
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
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") },
                    procurement_classification_1: $scope.getReactively("category"),
                    sercop_service: $scope.getReactively("service"),
                    period: $scope.getReactively("period"),
                    client: $scope.getReactively("selectedClient")
                };
            },
            filterSelectedOrganisation: function () {
                var organisations = $scope.getCollectionReactively("selectedOrganisation");
                $scope.filteredOrganisations = [];
                organisations.forEach((organisation) => {
                    $scope.filteredOrganisations.push(organisation.id);
                });
            }
        });

        // UX defaults on component open
        $scope.detailsVisible = true;
        $scope.drillDownVisible = true;
        $scope.performanceIndicatorsVisible = true;
        $scope.period = "quarter";

        // TODO: remove this hardcoded default option, just use the first item in the list
        // $scope.selectedOrganisation = "Wakefield MDC";

        function filterPeriod(period) {
            let selectedYear;
            let selectedMonth;
            var index = 0;
            var startDate, endDate;
            $scope.filterName = period;

            // Clear filter
            if (period == null) {
                $scope.selectedPeriod = null;
                return;
            }

            if ($scope.period === 'quarter') {
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

        function selectAllOrganisation() {
            console.log('selected All');
        };

        function reachedMaxSelection() {
            console.log('reached Max Selection');
        };

        let abbreviate_number = function (num, fixed) {
            if (num === null) { return null; } // terminate early
            if (num === 0) { return '0'; } // terminate early
            fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
            var b = (num).toPrecision(2).split("e"), // get power
                k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
                c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3)).toFixed(1 + fixed), // divide by power
                d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
                e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power
            return e;
        };

        let clientSub = $scope.subscribe('clients');
        $scope.subscribe('spendingOrganisations');
        $scope.subscribe('spendingServices');
        $scope.subscribe('spendingCategories');

        $scope.subscribe('spendingPerTime', function () {
            $scope.filterName = '';
            return [{
                organisation_name: { $in: $scope.getReactively("filteredOrganisations") },
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
                organisation_name: { $in: $scope.getReactively("filteredOrganisations") },
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

        let stringToColour = function (str) {
            var hash = 0;
            for (var i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            var colour = '#';
            for (var i = 0; i < 3; i++) {
                var value = (hash >> (i * 8)) & 0xFF;
                colour += ('00' + value.toString(16)).substr(-2);
            }
            return colour;
        }
        /**
         * Return the color for an organisation series
         */
        let getColor = (organisationName) => {
            return stringToColour(organisationName);
        };
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
