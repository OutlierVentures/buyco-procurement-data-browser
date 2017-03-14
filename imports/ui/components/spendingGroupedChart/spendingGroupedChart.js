import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import template from './spendingGroupedChart.html';

import { SpendingGrouped } from '../../../api/spendingGrouped';
import { ClientSpendingPerTime } from '../../../api/clientSpendingPerTime';
import { ClientSpendingGrouped } from '../../../api/clientSpendingGrouped';
import { MetaDataHelper } from '../../../utils';
import { CHART_FONT } from '../../stylesheet/config';

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
                organisation_name: this.getReactively("filters.organisation_name"),
                // procurement_classification_1: this.getReactively("filters.procurement_classification_1"),
                // sercop_service: this.getReactively("filters.sercop_service"),
                // supplier_name: this.getReactively("filters.supplier_name")
            };

            console.log(this.groupDisplayName);

            // if (this.groupDisplayName != 'category') {
            //     filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            // }

            // if (this.groupDisplayName != 'service') {
            //     filterOptions.sercop_service = this.getReactively("filters.sercop_service");
            // }

            // if (this.groupDisplayName != 'supplier') {
            //     filterOptions.supplier_name = this.getReactively("filters.supplier_name");
            // }
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
                filterOptions.payment_date = { $gt: this.getReactively("filterDate").startDate.toDate(), $lt: this.getReactively("filterDate").endDate.toDate() };
            }

            if (this.getReactively('selDate')) {
                filterOptions.payment_date = { $gt: this.getReactively("selDate").startDate.toDate(), $lt: this.getReactively("selDate").endDate.toDate() };
            }

            return [
                filterOptions,
                {
                    groupField: this.getReactively("groupField")
                }];
        });
        $scope.subscribe('clientSpendingGrouped', () => {
            let filterOptions = {
                organisation_name: this.getReactively("filters.organisation_name"),
                // procurement_classification_1: this.getReactively("filters.procurement_classification_1"),
                sercop_service: this.getReactively("filters.sercop_service"),
                supplier_name: this.getReactively("filters.supplier_name"),
                client_id: this.getReactively("filters.client.client_id")
            };

            // if (this.groupDisplayName != 'category') {
            //     filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            // }

            // if (this.groupDisplayName != 'service') {
            //     filterOptions.sercop_service = this.getReactively("filters.sercop_service");
            // }

            // if (this.groupDisplayName != 'supplier') {
            //     filterOptions.supplier_name = this.getReactively("filters.supplier_name");
            // }
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
                filterOptions.payment_date = { $gt: this.getReactively("filterDate").startDate.toDate(), $lt: this.getReactively("filterDate").endDate.toDate() };
            }

            if (this.getReactively('selDate')) {
                filterOptions.payment_date = { $gt: this.getReactively("selDate").startDate.toDate(), $lt: this.getReactively("selDate").endDate.toDate() };
            }

            return [
                filterOptions,
                {
                    groupField: this.getReactively("groupField")
                }];
        });

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

            // if (this.groupDisplayName != 'category') {
            //     filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            // }

            // if (this.groupDisplayName != 'service') {
            //     filters.sercop_service = this.getReactively("filters.sercop_service");
            // }

            // if (this.groupDisplayName != 'supplier') {
            //     filters.supplier_name = this.getReactively("filters.supplier_name");
            // }
            // The filter values can be "" when the empty item is selected. If we apply that, no rows will be shown,
            // while all rows should be shown. Hence we only add them if they have a non-empty value.

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

            // if (this.getReactively("filters.procurement_classification_1"))
            //     filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            // if (this.getReactively("filters.sercop_service"))
            //     filters.sercop_service = this.getReactively("filters.sercop_service");
            // if (this.getReactively("filters.sercop_service"))
            //     filters.supplier_name = this.getReactively("filters.supplier_name");
            let temp = this.getReactively("filters.period");

            return SpendingGrouped.find(filters);
        };

        this.clientSpendingGrouped = () => {
            let filters = {
                organisation_name: this.getReactively("filters.organisation_name"),
                groupField: this.getReactively("groupField")
            };

            // The filter values can be "" when the empty item is selected. If we apply that, no rows will be shown,
            // while all rows should be shown. Hence we only add them if they have a non-empty value.
            // if (this.getReactively("filters.procurement_classification_1"))
            //     filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            // if (this.getReactively("filters.sercop_service"))
            //     filters.sercop_service = this.getReactively("filters.sercop_service");
            if (this.getReactively("filters.client"))
                filters.client_id = this.getReactively("filters.client.client_id");
            // if (this.getReactively("filters.supplier_name"))
            //     filters.supplier_name = this.getReactively("filters.supplier_name");

            // if (this.groupDisplayName != 'category') {
            //     filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            // }

            // if (this.groupDisplayName != 'service') {
            //     filters.sercop_service = this.getReactively("filters.sercop_service");
            // }

            // if (this.groupDisplayName != 'supplier') {
            //     filters.supplier_name = this.getReactively("filters.supplier_name");
            // }
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
            return ClientSpendingGrouped.find(filters);
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
                        color: getColor(organisation_name),
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
                            let newValue = abbreviate_number(arg.value, 0);
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
                                color: getColor(sourcePoint.organisationName)
                            };
                        }
                    },
                    onPointClick: function (e) {
                        var target = e.target;
                        if (!target.isSelected()) {
                            target.select();
                            selectedArgument = target.originalArgument;
                            let selectedService = getSelectedService(selectedArgument);
                            self.subfilter = selectedService;
                        } else {
                            target.clearSelection();
                            let selectedService = getSelectedService(selectedArgument);
                            self.subfilter = '';
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
                var chartHandle = getChartHandle();
                if(chartHandle) {
                    let series = chartHandle.getSeriesByPos(1);
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