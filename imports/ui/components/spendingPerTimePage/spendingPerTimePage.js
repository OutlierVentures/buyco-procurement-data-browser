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
import { Session } from 'meteor/session';

import { name as SpendingGroupedChart } from '../spendingGroupedChart/spendingGroupedChart';
import { name as SpendingPerformance } from '../spendingPerformance/spendingPerformance';

import { getColour, abbreviateNumber } from '../../../utils';

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
        $scope.allOrganisations = [];
        $scope.viewOrganisations = [];
        $scope.filteredOrganisations = [];

        $scope.ranges = {
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            [lastYearLabel]: [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
            [lastTwoYearsLabel]: [moment().subtract(2, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
            [yearBeforeLabel]: [moment().subtract(2, 'year').startOf('year'), moment().subtract(2, 'year').endOf('year')],
            'This Year': [moment().startOf('year'), moment().endOf('year')],
            ['All available data']: [moment("2010-01-01"), moment()]
        };

        $scope.filtersVisible = false;
        $scope.detailsVisible = false;
        $scope.period = "quarter";
        $scope.filterDate = {
            startDate: start,
            endDate: end
        };

        $scope.selectedPeriod = null;

        $scope.filterName = '';
        $scope.selectedPoint = {
            seriesName: '',
            pointName: ''
        };

        function applyFilters() {
            if (Session.get('category')) {
                $scope.category = Session.get('category');
            }

            if (Session.get('service')) {
                $scope.service = Session.get('service');
            }

            if (Session.get('filterStartDate')) {
                let dateObj = new Date(Session.get('filterStartDate'));
                $scope.filterDate.startDate = moment(dateObj);
            }

            if (Session.get('filterEndDate')) {
                let dateObj = new Date(Session.get('filterEndDate'));
                $scope.filterDate.endDate = moment(dateObj);
            }

            if (Session.get('period')) {
                $scope.period = Session.get('period');
            }

            if (Session.get('filterVisible')) {
                $scope.filtersVisible = Session.get('filterVisible');
            }

            if (Session.get('detailsVisible')) {
                $scope.detailsVisible = Session.get('detailsVisible');
            }

            if (Session.get('selectedPoint')) {
                $scope.selectedPoint = Session.get('selectedPoint');
            }

            if (Session.get('selectedStartDate')) {
                let dateObj = new Date(Session.get('selectedStartDate'));
                $scope.selectedPeriod = $scope.selectedPeriod || {};
                $scope.selectedPeriod.startDate = moment(dateObj);
            }

            if (Session.get('selectedEndDate')) {
                let dateObj = new Date(Session.get('selectedEndDate'));
                $scope.selectedPeriod = $scope.selectedPeriod || {};
                $scope.selectedPeriod.endDate = moment(dateObj);
            }
        }

        applyFilters();

        $scope.helpers({
            isLoggedIn: function () {
                return Meteor.userId() != null;
            },
            spendingPerTime: function () {
                return SpendingPerTime.find({}, { sort: { "_group.organisation_name": 1, "_group.year": 1, ["_group." + $scope.period]: 1 }}).fetch();
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
                            if (isAllClient || subTotal._group.organisation_name == data._group.organisation_name) {
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

                                    if(!table.client_amount_net)
                                        table.client_amount_net = data.client_amount_net;
                                    else
                                        table.client_amount_net += data.client_amount_net;

                                    if(table.totalAmount)
                                        table.client_amount_net_percent = table.client_amount_net / table.totalAmount * 100;
                                }
                            });

                            if (!isExist) {
                                if (data._group.year != '') {
                                    data._group.organisation_name = 'All organisations';
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
                // Create an array with all organisations to be used when "All organisations" is selected.
                // TODO: don't pass the individual organisations for this as a filter, just leave out the 
                // filter for organisations.
                $scope.allOrganisations = [];

                let organisations = SpendingOrganisations.find({}, { sort: { "organisation_name": 1 }}).fetch();
                organisationsBuffer.push(allOrgs);
                organisations.forEach((organisation) => {
                    organisationsBuffer.push({
                        id: organisation._id,
                        label: organisation.organisation_name
                    });

                    $scope.allOrganisations.push({
                        id: organisation._id,
                        label: organisation.organisation_name
                    });
                });

                if ( organisationsBuffer.length ) {

                    if (Session.get('organisation') && organisationsBuffer.length > 1) {
                        $scope.viewOrganisations = [];
                        let session_organisations = Session.get('organisation');

                        session_organisations.forEach((org) => {
                            organisationsBuffer.forEach((orgBuffer) => {
                                if (org.label === orgBuffer.label) {
                                    $scope.viewOrganisations.push(orgBuffer);
                                }
                            })
                        });

                        if ($scope.viewOrganisations.length) {
                            if ($scope.viewOrganisations[0].id == "All organisations") {
                                $scope.selectedOrganisation = $scope.allOrganisations;
                                isAllClient = true;
                            } else {
                                $scope.selectedOrganisation = $scope.viewOrganisations;
                                isAllClient = false;
                            }
                        } else {
                            $scope.selectedOrganisation = [];
                        }
                    }

                    if ($scope.viewOrganisations.length == 0) {
                        $scope.viewOrganisations[0] = organisationsBuffer[0];
                    }

                    // When the special "All organisations" item is selected, use the collection with all organisations as
                    // the selection filter. Effectively this causes a filter like:
                    // "{ organisation_name: { $in : [ every, single, organisation, ...] } }"
                    // It's more efficient to just leave out the organisation filter in that case.
                    if ($scope.viewOrganisations[0].id == 'All organisations') {
                        $scope.selectedOrganisation = $scope.allOrganisations;
                    }

                    $scope.previousSelection = $scope.viewOrganisations;
                }

                return organisationsBuffer;
            },
            spendingServices: function () {
                if(that.subManager && !that.subManager.ready()) {
                    return [];
                }
                let services = SpendingServices.find({
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") }
                }, { sort: { "name": 1 } }
                ).fetch();

                return services;
            },
            spendingCategories: function () {
                if(that.subManager && !that.subManager.ready()) {
                    return [];
                }
                let categories = SpendingCategories.find({
                    organisation_name: { $in: $scope.getReactively("filteredOrganisations") }
                }, { sort: { "name": 1 } }
                ).fetch();

                return categories;
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
                    // For "All organisations", data is summed on the client.
                    // For larger data sets that will get very inefficient.
                    // TODO: sum data for "All organisations" on the server (`spendingPerTime/publish.js`) by using
                    // a parameter in the subscription.
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
                        color: getColour("All")
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
                            color: getColour(org.id)
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
                            Session.setPersistent('selectedPoint', $scope.selectedPoint);
                            filterPeriod(selectedArgument);
                        } else {
                            target.clearSelection();
                            $scope.selectedPoint.seriesName = '';
                            $scope.selectedPoint.pointName = '';
                            Session.setPersistent('selectedPoint', $scope.selectedPoint);
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
                            let newValue = abbreviateNumber(arg.value, 0);
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
        // $scope.detailsVisible = true;
        $scope.drillDownVisible = true;
        $scope.performanceIndicatorsVisible = true;

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
                    $scope.selectedOrganisation = $scope.allOrganisations;
                    isAllClient = true;
                } else {
                    $scope.selectedOrganisation = $scope.viewOrganisations;
                    isAllClient = false;
                }
            } else {
                $scope.selectedOrganisation = [];
            }

            Session.setPersistent('organisation', $scope.viewOrganisations);
        };

        $scope.onClickFilterVisible = function () {
            $scope.filtersVisible = !$scope.filtersVisible;
            Session.setPersistent('filterVisible', $scope.filtersVisible);
        };

        $scope.onClickDetailsVisible = function () {
            $scope.detailsVisible = !$scope.detailsVisible;
            Session.setPersistent('detailsVisible', $scope.detailsVisible);
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
                Session.setPersistent('selectedStartDate', null);
                Session.setPersistent('selectedEndDate', null);
                return;
            }

            if ($scope.period === 'quarter') {
                // Example: 2015-Q2
                index = period.search('Q');
                selectedYear = period.substring(0, index - 1);
                // End month, example: 6
                selectedMonth = period.substring(index + 1) * 3;
                // First day of first month of quarter (example: 04-01)
                startDate = new Date(selectedYear + '-' + (selectedMonth - 2) + '-01');
                endDate = new Date(startDate);
                endDate.setMonth(selectedMonth);
                // End date is now "2015-07-01". Use setDate(0) to go one day back. This works well 
                // even for December --> January.
                endDate.setDate(0);
            } else { // if month
                // Example: 2015-11
                index = period.search('-');
                selectedYear = period.substring(0, index);
                // selectedMonth has the display value (11).
                selectedMonth = period.substring(index + 1);
                selectedMonth = Number(selectedMonth);
                startDate = new Date(selectedYear + '-' + selectedMonth + '-01');
                endDate = new Date(startDate);
                // We increase the month by 1 (setMonth is 0-based and the display value is 1-based),
                // then decrease the date by 1. 
                // Example: setMonth(11) --> 2016-12-01, setDate(0) --> 2016-11-30
                endDate.setMonth(selectedMonth);
                endDate.setDate(0);
            }

            $scope.selectedPeriod = {
                startDate: moment(startDate),
                endDate: moment(endDate)
            };

            Session.setPersistent('selectedStartDate', $scope.selectedPeriod.startDate.toDate());
            Session.setPersistent('selectedEndDate', $scope.selectedPeriod.endDate.toDate());
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

        function saveFilters () {
            let category = $scope.getReactively("category");
            let service = $scope.getReactively("service");
            let startDate = $scope.getReactively("filterDate").startDate.toDate();
            let endDate = $scope.getReactively("filterDate").endDate.toDate();
            let period = $scope.getReactively("period");

            Session.setPersistent('category', category);
            Session.setPersistent('service', service);
            Session.setPersistent('filterStartDate', startDate);
            Session.setPersistent('filterEndDate', endDate);
            Session.setPersistent('period', period);
        }

        this.subManager = new SubsManager();
        let clientSub = $scope.subscribe('clients');
        $scope.subscribe('spendingOrganisations');
        this.subManager.subscribe('spendingServices');
        this.subManager.subscribe('spendingCategories');

        $scope.subscribe('spendingPerTime', function () {
            let organisations = '';
            // TODO: refactor this expression to a function on the constructor class, call that in all places
            // where we want to check "should we show all clients?"
            let isAllClient = $scope.viewOrganisations.length && $scope.viewOrganisations[0].id == 'All organisations';

            if (isAllClient) {// for subscribe one time
                organisations = '';
            } else {
                organisations = { $in: $scope.getReactively("filteredOrganisations") };
            }

            $scope.getReactively("filteredOrganisations");
            saveFilters();

            return [{
                organisation_name: organisations,
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service"),
                supplier_name: $scope.getReactively('supplier_name'),
                // Use  `payment_date` for filter and group rather than `effective_date` even though
                // the latter might be the correct one.
                // TODO: do more data analysis/wrangling to get `effective_date` right and start using that.
                payment_date: { $gt: $scope.getReactively("filterDate").startDate.toDate(), $lt: $scope.getReactively("filterDate").endDate.toDate() }
            },
            {
                period: $scope.getReactively("period"),
                groupField: (isAllClient ? undefined : "organisation_name")
            }];
        });

        $scope.subscribe('clientSpendingPerTime', function () {
            let organisations = '';

            let isAllClient = $scope.viewOrganisations.length && $scope.viewOrganisations[0].id == 'All organisations';

            if (isAllClient) {// for subscribe one time
                organisations = '';
            } else {
                organisations = { $in: $scope.getReactively("filteredOrganisations") };
            }

            $scope.getReactively("filteredOrganisations");

            return [{
                client_id: $scope.getReactively("selectedClient.client_id"),
                organisation_name: organisations,
                procurement_classification_1: $scope.getReactively("category"),
                sercop_service: $scope.getReactively("service"),
                supplier_name: $scope.getReactively('supplier_name'),
                payment_date: { $gt: $scope.getReactively("filterDate").startDate.toDate(), $lt: $scope.getReactively("filterDate").endDate.toDate() }
            },
            {
                period: $scope.getReactively("period"),
                groupField: (isAllClient ? undefined : "organisation_name")
            }];
        });

        this.autorun(() => {
            // Select the first client option by default when the subscription is ready.
            if (clientSub.ready()) {
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
