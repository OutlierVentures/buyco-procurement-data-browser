import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import utilsPagination from 'angular-utils-pagination';

import { Counts } from 'meteor/tmeasday:publish-counts';

import { SpendingPerTime } from '../../../api/spendingPerTime';
import { Predictions } from '../../../api/predictions';

import { getColour, abbreviateNumber } from '../../../utils';

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
            selectedPeriod: function () {
                return $scope.getReactively("filterDate");
            },
            filterPeriodName: function () {
                return $scope.getReactively("filterName");
            },
            predictionData: function (){
                return Predictions.find({}, { sort: { "_group.organisation_name": 1, "_group.year": 1, ["_group." + $scope.period]: 1 } }).fetch();
            },
            chartData: function () {
                let spendingPerTime = $scope.getReactively("spendingPerTime");                
                let i = 0;

                let pointsByPeriod = [];

                // The grouped records look like this:
                // { _group: { year: 2016, quarter: "2016 Q1", organisation_name: "Some Council"}, totalAmount: 12345},
                // { _group: { year: 2016, quarter: "2016 Q1", organisation_name: "Another Council"}, totalAmount: 54321},
                // ...

                var predictionData = $scope.getReactively("predictionData");

                // Loop through the forecast data as it has a wider time reach than the real data.
                predictionData.forEach((predictionThisPeriod) => {
                    let spendThisPeriod = _(spendingPerTime).find((v) => {
                        return v._group
                            && v._group.year == predictionThisPeriod._group.year
                            && v._group[$scope.period] === predictionThisPeriod._group[$scope.period]
                            && v._group.organisation_name === predictionThisPeriod._group.organisation_name;
                    });

                    let xLabel;
                    if ($scope.period == "quarter")
                        // "2016 Q2"
                        xLabel = predictionThisPeriod._group.year + " Q" + predictionThisPeriod._group.quarter;
                    else
                        // E.g. "2016-05" for May 2016
                        xLabel = predictionThisPeriod._group.year + "-" + ("00" + predictionThisPeriod._group.month).slice(-2);

                    let dataPoint = pointsByPeriod[xLabel];
                    if (!dataPoint) {
                        dataPoint = { xAxis: xLabel };
                        pointsByPeriod[xLabel] = dataPoint; 
                    }

                    let amount = predictionThisPeriod.totalAmount;
                    let dataPointGroup = predictionThisPeriod._group.organisation_name;

                    let predictionPointKey = "prediction_" + dataPointGroup;

                    dataPoint[predictionPointKey] = amount;

                    if(spendThisPeriod) {
                        let amount = spendThisPeriod.totalAmount;
                        let dataPointGroup = spendThisPeriod._group.organisation_name;

                        if (dataPoint[dataPointGroup]) {
                            dataPoint[dataPointGroup] += amount;
                        } else {
                            dataPoint[dataPointGroup] = amount;
                        }
                    }

                    i++;
                });

                // pointsByPeriod looks like this: [ "2016 Q1": {...}, "2016 Q2": {...}] with {...} being data points.
                // dxCharts wants a numeric array.
                let sourceValues = _.values(pointsByPeriod);

                let series = [];
                let seriesName = '';

                // Create series for the selected organisation / group, another series for for predictions.
                series.push({
                    argumentField: "xAxis",
                    valueField: $scope.organisation_name,
                    name: "Historical spending",
                    type: "bar",
                    color: getColour($scope.organisation_name)
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
