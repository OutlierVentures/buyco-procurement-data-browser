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
    constructor($scope, $reactive, $rootScope, $element) {
        'ngInject';

        $rootScope.$on('resizeRequested', function (e) {
            resizeTimeChart();
        });

        $reactive(this).attach($scope);

        let that = this;

        let start = moment().subtract(1, 'year').startOf('year');
        let end = moment();
        lastYearLabel = 'Last Year (' + moment().subtract(1, 'year').startOf('year').year() + ')';
        lastTwoYearsLabel = 'Last Two Years (' + moment().subtract(2, 'year').startOf('year').year() + '-' + moment().subtract(1, 'year').startOf('year').year() + ')';
        yearBeforeLabel = 'Year Before Last (' + moment().subtract(2, 'year').startOf('year').year() + ')';

        $scope.selectedOrganisation = [];
        let allOrgs = {
            label: "All organisations",
            id: 'All organisations'
        };
        let isAllClient = true;
        $scope.realOrganisations = [];
        $scope.viewOrganisations = [];
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
        $scope.selectedPoint = {
            seriesName: '',
            pointName: ''
        };

        $scope.helpers({
            isLoggedIn: function () {
                return Meteor.userId() != null;
            },
            spendingPerTime: function () {
                return SpendingPerTime.find({}).fetch();
            },
            clientSpendingPerTime: function () {
                return ClientSpendingPerTime.find({}).fetch();
            },
            mergedSpendingPerTime: function () {
                // Prepare a joined collection with the percentage of client trade.
                // TODO: this is business logic, move it to an API function.
                // Sort the data by organisation name to ensure precondition for sub total comparison.
                let ps = SpendingPerTime.find({}, { sort: { "_group.organisation_name": 1, "_group.year": 1, ["_group." + $scope.period]: 1 } });
                let cs = ClientSpendingPerTime.find({});

                let totalValues = {
                    total: 0,
                    client_amount_net: 0,
                    client_amount_net_percent: 0
                };

                let merged = [];
                let mergedTable = [];

                ps.forEach((spendThisPeriod) => {
                    let mergedItem = JSON.parse(JSON.stringify(spendThisPeriod));

                    totalValues.total += mergedItem.totalAmount;
                    merged.push(mergedItem);
                    cs.forEach((clientSpendThisPeriod) => {
                        if (clientSpendThisPeriod._group.year == spendThisPeriod._group.year
                            && clientSpendThisPeriod._group.organisation_name == spendThisPeriod._group.organisation_name
                            && clientSpendThisPeriod._group[$scope.period] == spendThisPeriod._group[$scope.period]) {

                            mergedItem.client_amount_net = JSON.parse(JSON.stringify(clientSpendThisPeriod.totalAmount));
                            mergedItem.client_amount_net_percent = mergedItem.client_amount_net / spendThisPeriod.totalAmount * 100;
                            totalValues.client_amount_net += mergedItem.client_amount_net;
                        }
                    });
                });

                if (totalValues.client_amount_net != 0) {
                    totalValues.client_amount_net_percent = totalValues.client_amount_net / totalValues.total * 100;
                }

                if (merged.length) {
                    if ($scope.selectedOrganisation.length > 1) {
                        // Compute sub totals per organisation.
                        // Precondition: the rows are ordered by organisation, i.e. all rows for any organisation are grouped together.

                        let subTotal = JSON.parse(JSON.stringify(merged[0]));
                        subTotal.totalAmount = 0;
                        subTotal.client_amount_net = 0;

                        merged.forEach(function (data, i) {
                            if (subTotal._group.organisation_name == data._group.organisation_name) {
                                subTotal.totalAmount += data.totalAmount;

                                if (data.client_amount_net)
                                    subTotal.client_amount_net += data.client_amount_net;

                                subTotal.client_amount_net_percent = subTotal.client_amount_net / subTotal.totalAmount * 100;
                            } else {
                                // We've reached a new organisation.
                                // Add the previous sub totals row.
                                subTotal._group.organisation_name = 'Total - ' + subTotal._group.organisation_name;
                                subTotal._group.year = '';
                                subTotal._group[$scope.period] = '';
                                subTotal.isSubTotal = true;
                                mergedTable.push(JSON.parse(JSON.stringify(subTotal)));

                                // Start a new sub totals row
                                subTotal = JSON.parse(JSON.stringify(data));
                            }
                            mergedTable.push(JSON.parse(JSON.stringify(data)));
                        });

                        // Add the sub totals row for the last organisation.
                        subTotal._group.organisation_name = 'Total - ' + subTotal._group.organisation_name;
                        subTotal._group.year = '';
                        subTotal._group[$scope.period] = '';
                        subTotal.isSubTotal = true;
                        mergedTable.push(JSON.parse(JSON.stringify(subTotal)));
                    } else {
                        // Single organisation, no sub totals.
                        merged.forEach(function (data, i) {
                            mergedTable.push(JSON.parse(JSON.stringify(data)));
                        });
                    }
                }

                // Sum values according to year and period if All Organisation
                if (isAllClient) {
                    if (mergedTable && mergedTable.length) {
                        let allMergedTable = [];
                        mergedTable.forEach((data) => {
                            let isExist = false;
                            allMergedTable.forEach((table) => {
                               if (data._group.year == table._group.year && data._group[$scope.period] == table._group[$scope.period]) {
                                   isExist = true;
                                   table.totalAmount += data.totalAmount;
                                   table.client_amount_net += data.client_amount_net;
                                   table.client_amount_net_percent = table.client_amount_net / table.totalAmount * 100;
                               }
                            });

                            if (!isExist) {
                                if (data._group.year != '') {
                                    data._group.organisation_name = 'All Organisation';
                                    allMergedTable.push(data);
                                }
                            }
                        });

                        mergedTable = allMergedTable;
                    }
                }

                return {
                    totalValues: totalValues,
                    merged: mergedTable
                };
            },
            firstClient: function () {
                let cs = $scope.getReactively('clients');
                if (cs && cs.length > 0)
                    return cs[0];
                return null;
            },
            clients: function () {
                return Clients.find({}).fetch();
            },
            spendingOrganisations: function () {
                let organisationsBuffer = [];
                $scope.realOrganisations = [];
                let organisations = SpendingOrganisations.find({}).fetch();

                organisationsBuffer.push(allOrgs);
                organisations.forEach((organisation) => {
                    organisationsBuffer.push({
                        id: organisation._id,
                        label: organisation.organisation_name
                    });

                    $scope.realOrganisations.push({
                        id: organisation._id,
                        label: organisation.organisation_name
                    });
                });

                if ( organisationsBuffer.length ) {
                    $scope.viewOrganisations[0] = organisationsBuffer[0];

                    if ($scope.viewOrganisations[0].id == 'All organisations') {
                        $scope.selectedOrganisation = $scope.realOrganisations;
                    }
                    $scope.previousSelection = $scope.viewOrganisations;
                }

                $scope.organisationCount = organisationsBuffer.length;
                return organisationsBuffer;
            },
            spendingServices: function () {
                let services = SpendingServices.find({
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") }
                }).fetch();

                services.sort(function(a, b) {
                    let nameA = a.name.toUpperCase(); // ignore upper and lowercase
                    let nameB = b.name.toUpperCase(); // ignore upper and lowercase
                    if (nameA < nameB) {
                        return -1;
                    }
                    if (nameA > nameB) {
                        return 1;
                    }

                    // names must be equal
                    return 0;
                });

                return services;
            },
            spendingCategories: function () {
                let categories = SpendingCategories.find({
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") }
                }).fetch();

                categories.sort(function(a, b) {
                    let nameA = a.name.toUpperCase(); // ignore upper and lowercase
                    let nameB = b.name.toUpperCase(); // ignore upper and lowercase
                    if (nameA < nameB) {
                        return -1;
                    }
                    if (nameA > nameB) {
                        return 1;
                    }

                    // names must be equal
                    return 0;
                });

                return categories;
            },
            selectedPeriod: function () {
                return $scope.getReactively("filterDate");
            },
            filterPeriodName: function () {
                return $scope.getReactively("filterName");
            },
            chartData: function () {
                let spendingPerTime = $scope.getReactively("spendingPerTime");
                let allowedClients = $scope.getReactively("clients");
                let clientSpendingPerTime = $scope.getReactively("clientSpendingPerTime");
                let publicValues = [];
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

                spendingPerTime.forEach((spendThisPeriod) => {
                    let xLabel;
                    if ($scope.period == "quarter")
                        // "2016 Q2"
                        xLabel = spendThisPeriod._group.year + " Q" + spendThisPeriod._group.quarter;
                    else
                        // E.g. "2016-05" for May 2016
                        xLabel = spendThisPeriod._group.year + "-" + ("00" + spendThisPeriod._group.month).slice(-2);

                    let dataPoint = pointsByPeriod[xLabel];
                    if (!dataPoint) {
                        dataPoint = { xAxis: xLabel };
                        pointsByPeriod[xLabel] = dataPoint;
                    }

                    let amount = spendThisPeriod.totalAmount;
                    let dataPointGroup = isAllClient ? "All" : spendThisPeriod._group.organisation_name;
                    if(dataPoint[dataPointGroup]) {
                        dataPoint[dataPointGroup] += amount;
                    } else {
                        dataPoint[dataPointGroup] = amount;
                    }
                    // dataPoint[spendThisPeriod._group.organisation_name] = amount;

                    let clientVal = _(clientSpendingPerTime).find((v) => {
                        return v._group
                            && v._group.year == spendThisPeriod._group.year
                            && v._group[$scope.period] === spendThisPeriod._group[$scope.period]
                            && v._group.organisation_name === spendThisPeriod._group.organisation_name;
                    });

                    if (clientVal !== undefined) {
                        let clientPointKey = "clientValue_" + (isAllClient ? "All" : spendThisPeriod._group.organisation_name);
                        if(dataPoint[clientPointKey]) {
                            dataPoint[clientPointKey] += clientVal.totalAmount;
                        } else {
                            dataPoint[clientPointKey] = clientVal.totalAmount;
                        }
                        // dataPoint[clientPointKey] = clientVal.totalAmount;
                    }

                    // Fill tabular data.
                    if ($scope.selectedOrganisation.length == 1)
                        publicValues.push({ x: i, label: xLabel, y: amount, source: spendThisPeriod });

                    i++;
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
                if (isAllClient) {
                    series.push({
                        argumentField: "xAxis",
                        valueField: "All",
                        name: "All",
                        type: "bar",
                        color: getColor("All")
                    });

                    // Add client series if we have data for it
                    if (allowedClients.length > 0 && sc) {
                        series.push({
                            argumentField: "xAxis",
                            valueField: "clientValue_" + "All",
                            name: sc.name + " - " + "All",
                            type: "bar",
                            color: '#543996'
                        })
                    }
                } else {
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
                }

                let selectedArgument = 0;

                const options = {
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
                        let target = e.target;
                        if (!target.isSelected()) {
                            target.select();
                            selectedArgument = target.originalArgument;
                            $scope.selectedPoint.seriesName = target.series.name;
                            $scope.selectedPoint.pointName = selectedArgument;
                            filterPeriod(selectedArgument);
                        } else {
                            target.clearSelection();
                            $scope.selectedPoint.seriesName = '';
                            $scope.selectedPoint.pointName = '';
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
                markSelectedPoint();

                resizeTimeChart();

                return options;
            },
            /**
             * Filter fields to pass to the sub charts. This variable is bound by the sub chart
             * component in the template.
             */
            subChartFilters: () => {
                $scope.selectedPeriod = '';
                return {
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") },
                    procurement_classification_1: $scope.getReactively("category"),
                    sercop_service: $scope.getReactively("service"),
                    period: $scope.getReactively("period"),
                    client: $scope.getReactively("selectedClient"),
                    supplier_name: $scope.getReactively('supplier_name')
                };
            },
            filterSelectedOrganisation: function () {
                let organisations = $scope.getCollectionReactively("selectedOrganisation");
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

        function getChartHandle() {
            let chartDiv = angular.element($element).find("#timeChart");
            // Has the chart been initialised? https://www.devexpress.com/Support/Center/Question/Details/T187799
            if (!chartDiv.data("dxChart"))
                return;
            // Re-render the chart. This will correctly resize for the new size of the surrounding
            // div.
            let timechart = chartDiv.dxChart('instance');
            return timechart;
        }

        function markSelectedPoint() {
            setTimeout(function () {
                let chartHandle = getChartHandle();
                if(chartHandle) {
                    let series = chartHandle.getSeriesByName($scope.selectedPoint.seriesName);
                    if(series && series.getAllPoints().length) {
                        let allPoints = series.getAllPoints();
                        allPoints.forEach((point) => {
                            let serviceName = point.initialArgument;
                            if (serviceName == $scope.selectedPoint.pointName) {
                                series.selectPoint(point);
                            }
                        });
                    }
                }
            }, 800);
        }

        // TODO: remove this hardcoded default option, just use the first item in the list

        $scope.checkSelection = function() {
            let prevTotalsItemSelected;

            if ($scope.previousSelection && $scope.previousSelection.length == 1 && $scope.previousSelection[0].id == "All organisations") {
                prevTotalsItemSelected = $scope.previousSelection[0];
            }

            let totalsItemSelected = null;
            let nonTotalsItemSelected = null;

            $scope.viewOrganisations.forEach(function(selectedItem) {
                if (selectedItem == prevTotalsItemSelected)
                    return false;

                if (totalsItemSelected)
                    return false;

                if (selectedItem.id == "All organisations") {
                    totalsItemSelected = selectedItem;
                } else {
                    nonTotalsItemSelected = selectedItem;
                }
            });

            if (totalsItemSelected) {
                $scope.viewOrganisations = [totalsItemSelected];
            } else if (prevTotalsItemSelected && nonTotalsItemSelected && $scope.viewOrganisations.length == 2) {
                $scope.viewOrganisations = [nonTotalsItemSelected]
            }

            $scope.previousSelection = $scope.viewOrganisations;

            if ($scope.viewOrganisations.length) {
                if ($scope.viewOrganisations[0].id == "All organisations") {
                    $scope.selectedOrganisation = $scope.realOrganisations;
                    isAllClient = true;
                } else {
                    $scope.selectedOrganisation = $scope.viewOrganisations;
                    isAllClient = false;
                }
            } else {
                $scope.selectedOrganisation = [];
            }
        };

        function filterPeriod(period) {
            let selectedYear;
            let selectedMonth;
            let index = 0;
            let startDate, endDate;
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

        function resizeTimeChart() {
            // A page resize has been requested by another component. The chart object
            // needs to re-render to properly size.

            // Has the chart been initialised? https://www.devexpress.com/Support/Center/Question/Details/T187799
            let chartComponent = $('#timeChart');
            if (!chartComponent.data("dxChart"))
                return;

            // Re-render the chart. This will correctly resize for the new size of the surrounding
            // div.
            let timeChart = chartComponent.dxChart('instance');
            timeChart.render();
        }

        function selectAllOrganisation() {
            console.log('selected All');
        }

        function reachedMaxSelection() {
            console.log('reached Max Selection');
        }

        let abbreviate_number = function (num, fixed) {
            if (num === null) { return null; } // terminate early
            if (num === 0) { return '0'; } // terminate early
            fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
            let b = (num).toPrecision(2).split("e"), // get power
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
            return [{
                organisation_name: { $in: $scope.getReactively("filteredOrganisations") },
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service"),
                supplier_name: $scope.getReactively('supplier_name'),
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
            return [{
                client_id: $scope.getReactively("selectedClient.client_id"),
                organisation_name: { $in: $scope.getReactively("filteredOrganisations") },
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service"),
                supplier_name: $scope.getReactively('supplier_name'),
                payment_date: { $gt: $scope.getReactively("filterDate").startDate.toDate(), $lt: $scope.getReactively("filterDate").endDate.toDate() }
            },
            {
                period: $scope.getReactively("period")
            }];
        });

        this.autorun(() => {
            // Select the first client option by default when the subscription is ready.
            if (clientSub.ready()) {
                $scope.selectedClient = $scope.getReactively("firstClient");
            }
        });

        function stringToColour (str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            let colour = '#';
            for (let i = 0; i < 3; i++) {
                let value = (hash >> (i * 8)) & 0xFF;
                colour += ('00' + value.toString(16)).substr(-2);
            }
            return colour;
        }
        /**
         * Return the color for an organisation series
         */
        function getColor (organisationName) {
            return stringToColour(organisationName);
        }
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
