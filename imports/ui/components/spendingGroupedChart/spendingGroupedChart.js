import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import template from './spendingGroupedChart.html';
import { removeEmptyFilters, MetaDataHelper } from "/imports/utils";

import { SpendingGrouped } from '/imports/api/spendingGrouped';
import { ClientSpendingPerTime } from '/imports/api/clientSpendingPerTime';
import { ClientSpendingGrouped } from '/imports/api/clientSpendingGrouped';
import { CHART_FONT } from '../../stylesheet/config';
import { getColour, abbreviateNumber } from '../../../utils';

class SpendingGroupedChart {
    constructor($scope, $reactive, $element, $rootScope) {
        'ngInject';
        $reactive(this).attach($scope);

        var self = this;
        $rootScope.$on('resizeRequested', function (e) {
            resizeChart();
        });

        $scope.dataSource = [];
        $scope.organisation_names = [];
        $scope.fullScreenMode = false;

        // The subscribe triggers calls to the spendingGroup collection when any of the bound values
        // change. On initialisation, the values are empty and a call is executed anyway. This is handled
        // on the server: if groupField is empty, no data will be returned.
        $scope.subscribe('spendingGrouped', () => {
            let filterOptions = {
                organisation_name: this.getReactively("filters.organisation_name")
            };

            switch(this.groupDisplayName) {
                case 'category':
                    filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                    filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'service':
                    filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'supplier':
                    filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                    filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    break;
                default:
                    filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                    filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                    filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            }

            // We use $gte and $lte to include the start and end dates. For example, when start date is "2016-11-01T00:00"
            //  records on the 1st of November itself are included. If using $gt, they would be excluded.
            if (this.getReactively('filterDate')) {
                filterOptions.payment_date = { $gte: this.getReactively("filterDate").startDate.toDate(), $lte: this.getReactively("filterDate").endDate.toDate() };
            }

            if (this.getReactively('selDate')) {
                filterOptions.payment_date = { $gte: this.getReactively("selDate").startDate.toDate(), $lte: this.getReactively("selDate").endDate.toDate() };
            }

            removeEmptyFilters(filterOptions);

            var publishParams = [
                filterOptions,
                {
                    groupField: this.getReactively("groupField")
                }];

            return publishParams;
        });
        $scope.subscribe('clientSpendingGrouped', () => {
            let filterOptions = {
                organisation_name: this.getReactively("filters.organisation_name"),
                client_id: this.getReactively("filters.client.client_id")
            };

            switch(this.groupDisplayName) {
                case 'category':
                    filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                    filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'service':
                    filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'supplier':
                    filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                    filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    break;
                default:
                    filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                    filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                    filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            }

            if (this.getReactively('filterDate')) {
                filterOptions.payment_date = { $gte: this.getReactively("filterDate").startDate.toDate(), $lte: this.getReactively("filterDate").endDate.toDate() };
            }

            if (this.getReactively('selDate')) {
                filterOptions.payment_date = { $gte: this.getReactively("selDate").startDate.toDate(), $lte: this.getReactively("selDate").endDate.toDate() };
            }

            removeEmptyFilters(filterOptions);

            var publishParams = [
                filterOptions,
                {
                    groupField: this.getReactively("groupField")
                }];

            return publishParams;
        });

        // Subscribe to all predictions for the selected organisations and group field.
        // $scope.subscribe('predictions', () => {
        //     return [ {
        //         organisation_name: this.getReactively("filters.organisation_name"),                
        //         group_field: this.getReactively("groupField")
        //     }];
        // });

        // Subscriptions are per client session, so subscriptions between multiple sessions
        // won't overlap. However we open multiple subscriptions to the `spendingGrouped` collection
        // with a different group field and filters, which leads to different results.
        // The client is supplied with the complete result set and therefore must filter these
        // results through minimongo.
        // The filter fields are largely duplicated from the call to subscribe() above. De-duplicating
        // is left as an exercise to the reader; I couldn't get it to work reactively correctly when 
        // using a single filters object.
        this.spendingGrouped = () => {
            let filters = {
                organisation_name: this.getReactively("filters.organisation_name"),
                groupField: this.getReactively("groupField")
            };

            if (filters.organisation_name) {
                $scope.organisation_names = filters.organisation_name.$in;
            }

            switch(this.groupDisplayName) {
                case 'category':
                    filters.sercop_service = this.getReactively("filters.sercop_service");
                    filters.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'service':
                    filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    filters.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'supplier':
                    filters.sercop_service = this.getReactively("filters.sercop_service");
                    filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    break;
                default:
                    filters.sercop_service = this.getReactively("filters.sercop_service");
                    filters.supplier_name = this.getReactively("filters.supplier_name");
                    filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            }

            this.getReactively("filters.period");

            // The filter values can be "" when the empty item is selected. If we apply that, no rows will be shown,
            // while all rows should be shown. Hence we only add them if they have a non-empty value.
            removeEmptyFilters (filters);

            let data = SpendingGrouped.find(filters, { sort: { "_group.totalAmount": -1} }).fetch();
            return data;
        };

        this.clientSpendingGrouped = () => {
            let filters = {
                organisation_name: this.getReactively("filters.organisation_name"),
                groupField: this.getReactively("groupField")
            };

            filters.client_id = this.getReactively("filters.client.client_id");

            switch(this.groupDisplayName) {
                case 'category':
                    filters.sercop_service = this.getReactively("filters.sercop_service");
                    filters.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'service':
                    filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    filters.supplier_name = this.getReactively("filters.supplier_name");
                    break;
                case 'supplier':
                    filters.sercop_service = this.getReactively("filters.sercop_service");
                    filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                    break;
                default:
                    filters.sercop_service = this.getReactively("filters.sercop_service");
                    filters.supplier_name = this.getReactively("filters.supplier_name");
                    filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            }

            // The filter values can be "" when the empty item is selected. If we apply that, no rows will be shown,
            // while all rows should be shown. Hence we only add them if they have a non-empty value.
            removeEmptyFilters (filters);

            this.getReactively("filters.period");
            return ClientSpendingGrouped.find(filters).fetch();
        };

        $scope.helpers({
            isLoggedIn: function () {
                return Meteor.userId() != null;
            },
            groupDisplayName: () => {
                this.groupDisplayName = MetaDataHelper.getFieldDisplayName("public_spending", this.getReactively("groupField"));
                return this.groupDisplayName;
            },
            spendingGrouped: () => {
                return this.spendingGrouped();
            },
            chartData: () => {
                let dataSeries = [];
                $scope.dataSource = [];

                if (this.getReactively("filters.client")) {
                    dataSeries.push({
                        name: this.getReactively("filters.client.name"),
                        valueField: 'clientValue',
                        color: '#543996'
                    });
                }

                dataSeries.push({
                    valueField: "publicValue",
                    name: "Public spending",
                    showInLegend: false
                });

                // Add gray transparent block behind label text to improve readability
                dataSeries.push({
                    valueField: 'zero',
                    type: 'scatter',
                    point: {
                        color: 'none'
                    },
                    showInLegend: false,
                    label: {
                        visible: true,
                        font: {
                            family: CHART_FONT.FONT_NAME,
                            color: 'gray'
                        },
                        backgroundColor: "rgba(224, 224, 224, 0.6)",
                        customizeText: function (e) {
                            return e.argumentText;
                        }
                    }
                });

                $scope.organisation_names.forEach((organisation_name) => {
                    dataSeries.push({
                        valueField: 'zero',
                        type: 'scatter',
                        name: organisation_name,
                        color: getColour(organisation_name),
                        showInLegend: true,
                        point: {
                            color: 'none'
                        }
                    });
                });

                this.spendingGrouped().forEach((spendThisGroup) => {
                    let clientValue;
                    this.clientSpendingGrouped().forEach((clientData) => {
                        if (spendThisGroup.organisation_name == clientData.organisation_name && spendThisGroup.groupField == clientData.groupField
                            && spendThisGroup._group == clientData._group) {
                            clientValue = clientData.totalAmount;
                        }
                    });

                    let tempObj = {
                        organisationAndGroup: spendThisGroup.organisation_name + ' - ' + spendThisGroup._group,
                        publicValue: spendThisGroup.totalAmount,
                        clientValue: clientValue,
                        organisationName: spendThisGroup.organisation_name
                    };
                    $scope.dataSource.push(tempObj);
                });

                $scope.dataSource.sort(function (a, b) {
                    return a.publicValue - b.publicValue;
                });

                let numBars = $scope.dataSource.length * dataSeries.length;

                if (numBars > 10) {
                    $scope.chartSize = {
                        height: 700
                    }
                } else {
                    $scope.chartSize = {
                        height: 500
                    }
                }

                $scope.chartOptions = {
                    dataSource: $scope.dataSource.map(function (i) {
                        i.zero = 0;
                        return i;
                    }),
                    commonSeriesSettings: {
                        argumentField: "organisationAndGroup",
                        type: "bar"
                    },
                    argumentAxis: {
                        label: {
                            visible: false,
                            format: "largeNumber"
                        }
                    },
                    rotated: true,
                    series: dataSeries,
                    legend: {
                        verticalAlignment: "bottom",
                        horizontalAlignment: "center"
                    },
                    title: "",
                    export: {
                        enabled: true
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
                            let items = (arg.argumentText + " - " + arg.seriesName + " - " + newValue).split("\n"), color = arg.point.getColor();
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
                    },
                    valueAxis: [{
                        label: {
                            format: "largeNumber"
                        }
                    }],
                    size: $scope.chartSize,
                    customizePoint: function () {
                        if (this.series.name == "Public spending") {
                            let sourcePoint = $scope.dataSource[this.index];
                            return {
                                color: getColour(sourcePoint.organisationName)
                            };
                        }
                    },
                    onPointClick: function (e) {
                        let target = e.target;
                        if (!target.isSelected()) {
                            target.select();
                            selectedArgument = target.originalArgument;
                            let selectedService = getSelectedService(selectedArgument);
                            self.subfilter = selectedService;
                        } else {
                            target.clearSelection();
                            self.subfilter = null;
                        }
                    },
                };
                markSelectedSubFilter();
                return dataSeries;
            },
            filterPeriodName: () => {
                let filterName = this.getReactively("filterName");
                if (filterName)
                    filterName = 'Filter: ' + filterName + ', ';
                else
                    filterName = '';

                let category = this.getReactively("filters.procurement_classification_1");
                if (category)
                    filterName += 'Category: ' + category + ', ';

                let service = this.getReactively("filters.sercop_service");
                if (service)
                    filterName += 'Service: ' + service + ', ';

                let supplier = this.getReactively("filters.supplier_name");
                if (supplier)
                    filterName += 'Supplier: ' + supplier + ', ';

                filterName = filterName.substring(0, filterName.length - 2);
                return filterName;
            },
            insight: () => {
                // Show insights only to logged on users
                if(!Meteor.userId())
                    return null;

                // Stub function: show a random value for a random item from the list.
                // TODO: implement real value from prediction data.
                let items = this.getReactively("spendingGrouped")();

                if(!items || !items.length)
                    return null;
                
                let insightItem = items[Math.round(Math.random() * items.length)];

                // Don't show for empty categories
                if(!insightItem._group)
                    return;
                
                let date = new Date();
                date.setYear(date.getFullYear() + 1);

                // Quarter: deterministic value 1-4 for each item 
                let quarter = insightItem.count % 4 + 1;

                // Percentage: deterministic value -30 - +30
                let percentage = insightItem.count % 80 - 40;

                // Only show insights with a significant percentage.
                if (Math.abs(percentage) < 10)
                    return 0;

                let amountText = (percentage > 0 ? "+" : "") + percentage + "% by " + date.getFullYear() + "-Q" + quarter;

                return {
                    id: insightItem._group,
                    type: this.groupDisplayName,                    
                    organisation_name: insightItem.organisation_name,
                    description: insightItem.organisation_name + " - " + insightItem._group,
                    percentage: percentage,
                    amountText: amountText,
                    color: getColour(insightItem.organisation_name)
                }
            }
        });

        function getChartHandle() {
            var chartDiv = angular.element($element).find("#chart");
            // Has the chart been initialised? https://www.devexpress.com/Support/Center/Question/Details/T187799
            if (!chartDiv.data("dxChart"))
                return;
            // Re-render the chart. This will correctly resize for the new size of the surrounding
            // div.
            var timechart = chartDiv.dxChart('instance');
            return timechart;
        }

        function markSelectedSubFilter() {
            setTimeout(function () {
                let chartHandle = getChartHandle();
                if(chartHandle) {
                    let series = chartHandle.getSeriesByPos(0);
                    if(series && series.getAllPoints().length) {
                        let allPoints = series.getAllPoints();
                        allPoints.forEach((point) => {
                            let serviceName = point.initialArgument;
                            if (getSelectedService(serviceName) == self.subfilter) {
                                series.selectPoint(point);
                            }
                        });
                    }
                }
            }, 800);
        }

        function resizeChart() {
            var chartHandle = getChartHandle();
            chartHandle.render();
        }

        $scope.$watch('fullScreenMode', function () {
            setTimeout(() => {
                resizeChart();
            }, 100);
        });

        function getSelectedService(selectedArgument) {
            index = selectedArgument.search('-');
            selectedService = selectedArgument.substring(index + 2);
            return selectedService;
        }
    }

    $onInit = () => {}
}

const name = 'spendingGrouped';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter
]).component(name, {
    template,
    controllerAs: name,
    bindings: {
        subfilter: '=',
        // Filters should contain field names to match as equal.
        filters: '=',
        // The field to group by. Valid values: procurement_classification_1, supplier_name, sercop_service.
        groupField: '<',
        filterDate: '<',
        selDate: '<',
        filterName: '<'
    },
    controller: SpendingGroupedChart
});