import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import template from './spendingGroupedChart.html';
import { removeEmptyFilters, MetaDataHelper } from "/imports/utils";

import { SpendingGrouped } from '/imports/api/spendingGrouped';
import { Predictions } from '/imports/api/predictions';
import { ClientSpendingGrouped } from '/imports/api/clientSpendingGrouped';
import { CHART_FONT } from '../../stylesheet/config';
import { getColour, abbreviateNumber } from '../../../utils';
import { Session } from 'meteor/session';

class SpendingGroupedChart {
    constructor($scope, $reactive, $element, $rootScope) {
        'ngInject';
        $reactive(this).attach($scope);

        let self = this;
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

            let category = '';
            if (this.getCollectionReactively('selectionFilter.category') && this.getCollectionReactively('selectionFilter.category').length) {
                category = { $in: this.getCollectionReactively("selectionFilter.category") };
            } else {
                category = '';
            }

            let service = '';
            if (this.getCollectionReactively('selectionFilter.service') && this.getCollectionReactively('selectionFilter.service').length) {
                service = { $in: this.getCollectionReactively("selectionFilter.service") };
            } else {
                service = '';
            }

            let supplier = '';
            if (this.getCollectionReactively('selectionFilter.supplier') && this.getCollectionReactively('selectionFilter.supplier').length) {
                supplier = { $in: this.getCollectionReactively("selectionFilter.supplier") };
            } else {
                supplier = '';
            }
            switch(this.groupDisplayName) {
                // Disabled to partially fix https://github.com/OutlierVentures/buyco-procurement-data-browser/issues/73
                case 'category':
                    filterOptions.procurement_classification_1 = this.getCollectionReactively("filters.procurement_classification_1");
                    filterOptions.sercop_service = service;
                    filterOptions.supplier_name = supplier;
                    break;
                case 'service':
                    filterOptions.sercop_service = this.getCollectionReactively("filters.sercop_service");
                    filterOptions.procurement_classification_1 = category;
                    filterOptions.supplier_name = supplier;
                    break;
                case 'supplier':
                    filterOptions.supplier_name = this.getCollectionReactively("filters.supplier_name");
                    filterOptions.sercop_service = service;
                    filterOptions.procurement_classification_1 = category;
                    break;
                default:
                    filterOptions.sercop_service = this.getCollectionReactively("filters.sercop_service");
                    filterOptions.supplier_name = this.getCollectionReactively("filters.supplier_name");
                    filterOptions.procurement_classification_1 = this.getCollectionReactively("filters.procurement_classification_1");
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
            let publishParams = [
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
                // Disabled to partially fix https://github.com/OutlierVentures/buyco-procurement-data-browser/issues/73
                // case 'category':
                //     filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                //     filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                //     break;
                // case 'service':
                //     filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                //     filterOptions.supplier_name = this.getReactively("filters.supplier_name");
                //     break;
                // case 'supplier':
                //     filterOptions.sercop_service = this.getReactively("filters.sercop_service");
                //     filterOptions.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                //     break;
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

            let publishParams = [
                filterOptions,
                {
                    groupField: this.getReactively("groupField")
                }];

            return publishParams;
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
            let filterOptions = {
                organisation_name: this.getReactively("filters.organisation_name"),
                groupField: this.getReactively("groupField")
            };

            if (filterOptions.organisation_name) {
                $scope.organisation_names = filterOptions.organisation_name.$in;
            }

            let category = '';
            if (this.getCollectionReactively('selectionFilter.category') && this.getCollectionReactively('selectionFilter.category').length) {
                category = { $in: this.getCollectionReactively("selectionFilter.category") };
            } else {
                category = '';
            }

            let service = '';
            if (this.getCollectionReactively('selectionFilter.service') && this.getCollectionReactively('selectionFilter.service').length) {
                service = { $in: this.getCollectionReactively("selectionFilter.service") };
            } else {
                service = '';
            }

            let supplier = '';
            if (this.getCollectionReactively('selectionFilter.supplier') && this.getCollectionReactively('selectionFilter.supplier').length) {
                supplier = { $in: this.getCollectionReactively("selectionFilter.supplier") };
            } else {
                supplier = '';
            }
            switch(this.groupDisplayName) {
                // Disabled to partially fix https://github.com/OutlierVentures/buyco-procurement-data-browser/issues/73
                case 'category':
                    filterOptions.procurement_classification_1 = this.getCollectionReactively("filters.procurement_classification_1");
                    filterOptions.sercop_service = service;
                    filterOptions.supplier_name = supplier;
                    break;
                case 'service':
                    filterOptions.sercop_service = this.getCollectionReactively("filters.sercop_service");
                    filterOptions.procurement_classification_1 = category;
                    filterOptions.supplier_name = supplier;
                    break;
                case 'supplier':
                    filterOptions.supplier_name = this.getCollectionReactively("filters.supplier_name");
                    filterOptions.sercop_service = service;
                    filterOptions.procurement_classification_1 = category;
                    break;
                default:
                    filterOptions.sercop_service = this.getCollectionReactively("filters.sercop_service");
                    filterOptions.supplier_name = this.getCollectionReactively("filters.supplier_name");
                    filterOptions.procurement_classification_1 = this.getCollectionReactively("filters.procurement_classification_1");
            }

            this.getReactively("filters.period");

            // The filter values can be "" when the empty item is selected. If we apply that, no rows will be shown,
            // while all rows should be shown. Hence we only add them if they have a non-empty value.
            removeEmptyFilters (filterOptions);

            let data = SpendingGrouped.find(filterOptions, { sort: { "_group.totalAmount": -1} }).fetch();
            return data;
        };

        this.clientSpendingGrouped = () => {
            let filters = {
                organisation_name: this.getReactively("filters.organisation_name"),
                groupField: this.getReactively("groupField")
            };

            filters.client_id = this.getReactively("filters.client.client_id");

            switch(this.groupDisplayName) {
                // Disabled to partially fix https://github.com/OutlierVentures/buyco-procurement-data-browser/issues/73
                // case 'category':
                //     filters.sercop_service = this.getReactively("filters.sercop_service");
                //     filters.supplier_name = this.getReactively("filters.supplier_name");
                //     break;
                // case 'service':
                //     filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                //     filters.supplier_name = this.getReactively("filters.supplier_name");
                //     break;
                // case 'supplier':
                //     filters.sercop_service = this.getReactively("filters.sercop_service");
                //     filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
                //     break;
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
                let subFilterName = 'subfilter' + this.groupDisplayName;

                if (Session.get(subFilterName)) {
                    self.subfilter = Session.get(subFilterName);
                }

                if (Session.get('selectionfilter')) {
                    self.selectionFilter = Session.get('selectionfilter');
                }
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
                    pointSelectionMode: 'multiple',
                    onPointClick: function (e) {
                        let target = e.target;
                        let selectedArgument = target.originalArgument;
                        let selectedService = getSelectedService(selectedArgument);

                        if (!target.isSelected()) {
                            target.select();
                            addSelectedFilter(selectedService);
                            Session.setPersistent('selectionfilter', self.selectionFilter);
                        } else {
                            target.clearSelection();
                            removeSelectedFilter(selectedService);
                            Session.setPersistent('selectionfilter', self.selectionFilter);
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
                if (category) {
                    filterName += 'Category: ';
                    category.$in.forEach((filter) => {
                        filterName += filter + ', ';
                    });
                }

                let service = this.getReactively("filters.sercop_service");
                if (service) {
                    filterName += 'Service: ';
                    service.$in.forEach((filter) => {
                        filterName += filter + ', ';
                    });
                }

                let supplier = this.getReactively("filters.supplier_name");
                if (supplier) {
                    filterName += 'Supplier contains: ';
                    filterName += supplier.$regex + ", ";
                }

                filterName = filterName.substring(0, filterName.length - 2);
                return filterName;
            },
            getInsight: () => {
                // Show insights only to logged on users
                if(!Meteor.userId())
                    return null;

                // (Re-)set insight to empty until we have found one
                $scope.insight = undefined;

                // Get a random item from the list. See if there is a prediction. If yes, show insight.
                // if not, no insight.
                let items = this.getReactively("spendingGrouped")();

                if(!items || !items.length)
                    return null;
                
                let insightItem = items[Math.floor(Math.random() * items.length)];

                // Don't show for empty categories
                if(!insightItem._group)
                    return;

                let predictionSub = this.subscribe('predictions', 
                    () => {
                        return [insightItem.organisation_name,
                            insightItem.groupField,
                            insightItem._group]
                    },
                    {
                        onError: () => {

                        },
                        onReady: (err, res) => {
                            // The Predictions collection contains the aggregated items
                            let predictionValues = Predictions.find(
                                { "_group.quarter": 2, "_group.year": 2018,
                                "groupField": insightItem.groupField,
                                "_group.group_value": insightItem._group,
                                "_group.organisation_name": insightItem.organisation_name }
                            ).fetch();

                            // predictionSub.stop();

                            if(predictionValues.length == 0)
                                return;

                            let predictionPoint = predictionValues[0];                
                            
                            let year =  predictionPoint._group.year;
                            let quarter = predictionPoint._group.quarter;
                            let predictionValue = predictionPoint.totalAmount;

                            // Get value for last full quarter
                            // Stub: take the average of what we have
                            let startDate, endDate;

                            if (this.getReactively('filterDate')) {
                                startDate = this.getReactively("filterDate").startDate.toDate();
                                endDate = this.getReactively("filterDate").endDate.toDate();
                            }

                            if (this.getReactively('selDate')) {
                                startDate = this.getReactively("selDate").startDate.toDate();
                                endDate = this.getReactively("selDate").endDate.toDate();
                            }

                            let diff = endDate - startDate;
                            
                            let quartersShown = Math.ceil(diff/1000/3600/24/90);

                            let averageValue = insightItem.totalAmount / quartersShown;

                            // Percentage: deterministic value -30 - +30
                            let percentage = Math.round((predictionValue / averageValue - 1) * 100);

                            // Only show insights with a significant percentage.
                            if (Math.abs(percentage) < 10)
                                return 0;

                            let amountText = (percentage > 0 ? "+" : "") + percentage + "% by " + year + "-Q" + quarter;

                            $scope.insight = {
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

        /**
         * Mark the selected sub filter ("click filter") in the chart after a reload.
         */
        function markSelectedSubFilter() {
            setTimeout(function () {
                let chartHandle = getChartHandle();
                
                if(!chartHandle)
                    return;

                // Series index 0 should always be marked
                let seriesToMarkByPos = [0];
                
                // If showing client data, series 0 is the client data and series 1 is the public
                // spending data. Mark them both.
                if(self.getReactively("filters.client.client_id")){
                    seriesToMarkByPos.push(1);
                }

                for(let i = 0; i< seriesToMarkByPos.length; i++){
                    let series = chartHandle.getSeriesByPos(seriesToMarkByPos[i]);
                    if(series && series.getAllPoints().length) {
                        let allPoints = series.getAllPoints();
                        allPoints.forEach((point) => {
                            let serviceName = point.initialArgument;
                            if (self.subfilter && self.subfilter.length) {
                                self.subfilter.forEach((subfilter) => {
                                    if (getSelectedService(serviceName) == subfilter) {
                                        series.selectPoint(point);
                                    }
                                });
                            }

                            let selFilterName = getSelectionFilterByGroupName();

                            if (selFilterName && selFilterName.length) {
                                selFilterName.forEach((filter) => {
                                    if (getSelectedService(serviceName) == filter) {
                                        series.selectPoint(point);
                                    }
                                });
                            }
                        });
                    }
                }                
            }, 800);
        }

        function resizeChart() {
            let chartHandle = getChartHandle();
            if(!chartHandle)
                return;
            
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

        function addSelectedFilter(selectedFilter) {
            switch(self.groupDisplayName) {
                case 'category':
                    addFilterToSelectionFilterArray(self.selectionFilter.category, selectedFilter);
                    break;
                case 'service':
                    addFilterToSelectionFilterArray(self.selectionFilter.service, selectedFilter);
                    break;
                case 'supplier':
                    addFilterToSelectionFilterArray(self.selectionFilter.supplier, selectedFilter);
                    break;
                default:
                    break;
            }
        }

        function removeSelectedFilter(selectedFilter) {
            switch(self.groupDisplayName) {
                case 'category':
                    removeFilterFromSelectionFilterArray(self.selectionFilter.category, selectedFilter);
                    break;
                case 'service':
                    removeFilterFromSelectionFilterArray(self.selectionFilter.service, selectedFilter);
                    break;
                case 'supplier':
                    removeFilterFromSelectionFilterArray(self.selectionFilter.supplier, selectedFilter);
                    break;
                default:
                    break;
            }
        }

        function addFilterToSelectionFilterArray(filterArray, filter) {
            if (filterArray) {
                let index = filterArray.indexOf(filter);

                if (index > -1)
                    filterArray.splice(index, 1);
                else
                    filterArray.push(filter);
            } else {
                filterArray = [];
            }
        }

        function removeFilterFromSelectionFilterArray(filterArray, filter) {
            let index = filterArray.indexOf(filter);
            if (index > -1)
                filterArray.splice(index, 1);
        }

        function  getSelectionFilterByGroupName() {
            switch(self.groupDisplayName) {
                case 'category':
                    return self.selectionFilter.category;
                    break;
                case 'service':
                    return self.selectionFilter.service;
                    break;
                case 'supplier':
                    return self.selectionFilter.supplier;
                    break;
                default:
                    return self.selectionFilter.category;
            }
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
        subfilter: '<',
        // Filters should contain field names to match as equal.
        filters: '=',
        // The field to group by. Valid values: procurement_classification_1, supplier_name, sercop_service.
        groupField: '<',
        filterDate: '<',
        selDate: '<',
        filterName: '<',
        selectionFilter: '='
    },
    controller: SpendingGroupedChart
});