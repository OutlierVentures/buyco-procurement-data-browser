import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import utilsPagination from 'angular-utils-pagination';

import { Counts } from 'meteor/tmeasday:publish-counts';

import { SpendingPerTime } from '../../../api/spendingPerTime';
import { ClientSpendingPerTime } from '../../../api/clientSpendingPerTime';
import { Clients } from '../../../api/clients';
import { Predictions } from '../../../api/predictions';

import { getRegressionLine } from '/imports/utils/predictions';
import { getColour } from '../../../utils';

import { CHART_FONT } from '../../stylesheet/config';

import template from './spendingInsightPage.html';


class SpendingInsightPage {
    constructor($scope, $reactive, $rootScope, $element, $stateParams) {
        'ngInject';

        $scope.organisation_name = $stateParams.organisation_name;
        $scope.type = $stateParams.type;
        $scope.id = $stateParams.id;

        $rootScope.$on('resizeRequested', function (e) {
            resizeForecastChart();
        });

        $reactive(this).attach($scope);

        let that = this;

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
            selectedPeriod: function () {
                return $scope.getReactively("filterDate");
            },
            filterPeriodName: function () {
                return $scope.getReactively("filterName");
            },
            clients: function () {
                return Clients.find({}).fetch();
            },
            predictionData: function (){
                return Predictions.find({}).fetch();
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

                var regressionData = getRegressionLine(spendingPerTime);

                var predictionData = $scope.getReactively("predictionData");

                // Loop through the forecast data as it has a wider time reach than the real data.
                regressionData.points.forEach((regressionVal) => {
                    let spendThisPeriod = _(spendingPerTime).find((v) => {
                        return v._group
                            && v._group.year == regressionVal._group.year
                            && v._group[$scope.period] === regressionVal._group[$scope.period]
                            && v._group.organisation_name === regressionVal._group.organisation_name;
                    });

                    let predictionThisPeriod = _(predictionData).find((v) => {
                        return v._group
                            && v._group.year == regressionVal._group.year
                            && v._group[$scope.period] === regressionVal._group[$scope.period];
                    });

                    let xLabel;
                    if ($scope.period == "quarter")
                        // "2016 Q2"
                        xLabel = regressionVal._group.year + " Q" + regressionVal._group.quarter;
                    else
                        // E.g. "2016-05" for May 2016
                        xLabel = regressionVal._group.year + "-" + ("00" + regressionVal._group.month).slice(-2);

                    let dataPoint = pointsByPeriod[xLabel];
                    if (!dataPoint) {
                        dataPoint = { xAxis: xLabel };
                        pointsByPeriod[xLabel] = dataPoint;
                    }

                    dataPoint.regression = regressionVal.totalAmount;

                    if(spendThisPeriod) {
                        let amount = spendThisPeriod.totalAmount;
                        let dataPointGroup = spendThisPeriod._group.organisation_name;
                        // For "All organisations", data is summed on the client.
                        // For larger data sets that will get very inefficient.
                        // TODO: sum data for "All organisations" on the server (`spendingPerTime/publish.js`) by using
                        // a parameter in the subscription.
                        if (dataPoint[dataPointGroup]) {
                            dataPoint[dataPointGroup] += amount;
                        } else {
                            dataPoint[dataPointGroup] = amount;
                        }

                        let clientVal = _(clientSpendingPerTime).find((v) => {
                            return v._group
                                && v._group.year == spendThisPeriod._group.year
                                && v._group[$scope.period] === spendThisPeriod._group[$scope.period]
                                && v._group.organisation_name === spendThisPeriod._group.organisation_name;
                        });

                        if (clientVal !== undefined) {
                            let clientPointKey = "clientValue_" + dataPointGroup;
                            if (dataPoint[clientPointKey]) {
                                dataPoint[clientPointKey] += clientVal.totalAmount;
                            } else {
                                dataPoint[clientPointKey] = clientVal.totalAmount;
                            }
                            // dataPoint[clientPointKey] = clientVal.totalAmount;
                        }
                    
                        publicValues.push({ x: i, label: xLabel, y: amount, source: spendThisPeriod });
                    }

                    if(predictionThisPeriod) {
                        let amount = predictionThisPeriod.totalAmount;
                        let dataPointGroup = predictionThisPeriod._group.organisation_name;

                        let predictionPointKey = "prediction_" + dataPointGroup;

                        dataPoint[predictionPointKey] = amount;
                    }

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
                let seriesName = '';

                let sc = $scope.getReactively("selectedClient");

                // Create series for each selected organisation, and if client data is shown,
                // another series for client data for each organisation.
                series.push({
                    argumentField: "xAxis",
                    valueField: $scope.organisation_name,
                    name: "Historical spending",
                    type: "bar",
                    color: getColour($scope.organisation_name)
                });

                // Regression series
                seriesName = "Forecast - regression";
                series.push({
                    argumentField: "xAxis",
                    valueField: "regression",
                    name: seriesName,
                    type: "spline",
                    color: getColour(seriesName)
                });

                // Prediction series
                seriesName = "Forecast";
                let predictionPointKey = "prediction_" + $scope.organisation_name;

                series.push({
                    argumentField: "xAxis",
                    valueField: predictionPointKey,
                    name: seriesName,
                    type: "spline",
                    color: getColour(seriesName)
                });

                // Add client series if we have data for it
                if (allowedClients.length > 0 && sc) {
                    series.push({
                        argumentField: "xAxis",
                        valueField: "clientValue_" + $scope.organisation_name,
                        name: sc.name + " - " + $scope.organisation_name,
                        type: "spline",
                        color: '#543996'
                    })
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

                resizeForecastChart();

                return options;
            },
        });

        // UX defaults on component open
        $scope.period = "quarter";

        function getChartHandle() {
            let chartDiv = angular.element($element).find("#forecastChart");
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
                if (chartHandle) {
                    let series = chartHandle.getSeriesByName($scope.selectedPoint.seriesName);
                    if (series && series.getAllPoints().length) {
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

        function resizeForecastChart() {
            // A page resize has been requested by another component. The chart object
            // needs to re-render to properly size.

            // Has the chart been initialised? https://www.devexpress.com/Support/Center/Question/Details/T187799
            let chartComponent = $('#forecastChart');
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

        // Prepare filter data
        var organisations = '';
        let organisation_name = $scope.getReactively("organisation_name");

        organisations = { $in: [organisation_name] };

        var filters = {
            organisation_name: organisations,                
            // Make sure we don't show null items (1970, unix epoch)
            // For now don't show data beyond 2016
            payment_date: { $gt: new Date(2000,1,1), $lt: new Date(2017,1,1) }
        };

        let filterField;

        switch($scope.type) {
            case "category":
                filterField = "procurement_classification_1";
                break;
            case "service":
                filterField = "sercop_service";
                break;
            case "supplier":
                filterField = "supplier_name";
                break;
        }

        let filterValue = $scope.id;

        filters[filterField] = filterValue;

        $scope.subscribe('spendingPerTime', function () {
            return [
                filters,
            {
                period: $scope.getReactively("period"),
                groupField: "organisation_name"
            }];
        });

        $scope.subscribe('clientSpendingPerTime', function () {
            return [
                filters,
            {
                period: $scope.getReactively("period"),
                groupField: "organisation_name"
            }];
        });      

        $scope.subscribe('predictions', function () {
            return [
                organisation_name,
                filterField,
                filterValue,
            {
                period: $scope.getReactively("period"),
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

const name = 'spendingInsightPage';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
]).component(name, {
    template,
    controllerAs: name,
    controller: SpendingInsightPage
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('spending-insight', {
            url: '/spending/insight/:organisation_name/:type/:id',
            template: '<spending-insight-page [organisation_name]="' + name + '.organisation_name" [type]="' + name + '.type" [id]="' + name + '.id"></spending-insight-page>'
        });
}
