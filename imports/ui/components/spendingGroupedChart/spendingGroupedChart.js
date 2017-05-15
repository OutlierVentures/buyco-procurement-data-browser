import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import template from './spendingGroupedChart.html';
import { removeEmptyFilters, MetaDataHelper } from "/imports/utils";

import { SpendingGrouped } from '/imports/api/spendingGrouped';
import { Predictions } from '/imports/api/predictions';
import { ClientSpendingGrouped } from '/imports/api/clientSpendingGrouped';
import { CHART_FONT } from '../../stylesheet/config';
import { getColour, abbreviateNumber, combineInFilters } from '../../../utils';
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
            let filterOptions = $scope.getReactively("filterOptions", true);

            let publishParams = [
                filterOptions,
                {
                    groupField: this.getReactively("groupField")
                }];

            return publishParams;
        });

        $scope.subscribe('clientSpendingGrouped', () => {
            let filterOptions = $scope.getReactively("clientFilterOptions", true);

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
        this.spendingGrouped = () => {
            let filterOptions = $scope.getReactively("filterOptions", true);

            // AvA: Why is this here? To trigger a reload when the period changes? I think it can be removed.
            this.getReactively("filters.period");

            let data = SpendingGrouped.find( { $and: [ filterOptions, { "groupField": this.getReactively("groupField") } ] }, { sort: { "_group.totalAmount": -1} }).fetch();
            return data;
        };

        this.clientSpendingGrouped = () => {
            let filterOptions = $scope.getReactively("clientFilterOptions", true);

            // AvA: Why is this here? To trigger a reload when the period changes? I think it can be removed.
            this.getReactively("filters.period");

            return ClientSpendingGrouped.find( { $and: [ filterOptions, { "groupField": this.getReactively("groupField") } ] } ).fetch();
        };

        $scope.helpers({
            isLoggedIn: function () {
                return Meteor.userId() != null;
            },
            /**
             * The filters applied to fetch data. This object is used in both the subscriptions and the
             * local collection.find() calls. 
             * 
             * All filter variables within this helper are called with getReactively, causing this helper
             * to be re-evaluated when any of them changes.
             * 
             * Calls to this helper with getReactively should set the objectEquals argument 
             * to true (e.g. this.getReactively('filterOptions', true)) in order to watch for nested changes.
             */
            filterOptions: () => {
                let organisations = this.getReactively("filters.organisation_name");

                // Always requiring filtering by some or all organisations. If not set, we return null,
                // which causes the publish not to execute and prevent a heavy query.
                if (!organisations || !organisations.$in.length)
                    return {};

                // Save the organisation names to a scope variable for (a.o.) configuring the data series.
                $scope.organisation_names = organisations.$in;

                let filterOptions = {
                    organisation_name: organisations
                };

                let categorySelection = '';
                let categorySelectionCol = this.getCollectionReactively('selectionFilter.category');
                if (categorySelectionCol && categorySelectionCol.length) {
                    categorySelection = { $in: categorySelectionCol };
                } else {
                    categorySelection = '';
                }

                let serviceSelection = '';
                let serviceSelectionCol = this.getCollectionReactively('selectionFilter.service');
                if (serviceSelectionCol && serviceSelectionCol.length) {
                    serviceSelection = { $in: serviceSelectionCol };
                } else {
                    serviceSelection = '';
                }

                let supplierSelection = '';
                let supplierSelectionCol = this.getCollectionReactively('selectionFilter.supplier');
                if (supplierSelectionCol && supplierSelectionCol.length) {
                    supplierSelection = { $in: supplierSelectionCol };
                } else {
                    supplierSelection = '';
                }

                let categoryGlobal = this.getCollectionReactively("filters.procurement_classification_1");
                let serviceGlobal = this.getCollectionReactively("filters.sercop_service");
                let supplierContainsGlobal = this.getCollectionReactively("filters.supplier_contains");

                // For suppliers the filters work slighly different. On the global level there is a regex filter,
                // not an $in filter. The selection filter is an $in filter like the others. We can't combine
                // the regex with an $in filter, so we choose the one or the other.
                let supplierFilterToUse = "";

                if(supplierSelection && supplierSelection.$in.length)
                    supplierFilterToUse = supplierSelection;
                else
                    // The global filter is either empty or a regex clause. No further check necessary.
                    supplierFilterToUse = supplierContainsGlobal;

                // We now have variables for both global and selection filters for all fields, of the form { $in: [value1, value2, ...]}.
                // Depending on the group field we're showing, apply those filters in fetching the data. Selection filters
                // for field X are not applied when showing group field X, instead we mark the chart bar
                // as selected.

                switch(this.groupDisplayName) {
                    case 'category':
                        filterOptions.procurement_classification_1 = categoryGlobal;
                        filterOptions.sercop_service = combineInFilters(serviceGlobal, serviceSelection);
                        filterOptions.supplier_name = supplierFilterToUse;
                        break;
                    case 'service':
                        filterOptions.sercop_service = serviceGlobal;
                        filterOptions.procurement_classification_1 = combineInFilters(categoryGlobal, categorySelection);
                        filterOptions.supplier_name = supplierFilterToUse;
                        break;
                    case 'supplier':
                        filterOptions.supplier_name = supplierContainsGlobal;
                        filterOptions.sercop_service = combineInFilters(serviceGlobal, serviceSelection);
                        filterOptions.procurement_classification_1 = combineInFilters(categoryGlobal, categorySelection);
                        break;
                    default:
                        filterOptions.sercop_service = combineInFilters(serviceGlobal, serviceSelection);
                        filterOptions.supplier_name = supplierFilterToUse;
                        filterOptions.procurement_classification_1 = combineInFilters(categoryGlobal, categorySelection);
                }

                // We use $gte and $lte to include the start and end dates. For example, when start date is "2016-11-01T00:00"
                //  records on the 1st of November itself are included. If using $gt, they would be excluded.
                let filterDate = this.getReactively('filterDate', true);
                if (filterDate) {
                    filterOptions.payment_date = { $gte: filterDate.startDate.toDate(), $lte: filterDate.endDate.toDate() };
                }

                let selDate = this.getReactively('selDate', true);
                if (selDate) {
                    filterOptions.payment_date = { $gte: selDate.startDate.toDate(), $lte: selDate.endDate.toDate() };
                }

                // The filter values can be "" when the empty item is selected. If we apply that, no rows will be shown,
                // while all rows should be shown. Hence we only add them if they have a non-empty value.
                removeEmptyFilters(filterOptions);

                return filterOptions;
            },
            clientFilterOptions: () => {
                let filterOptions = $scope.getReactively("filterOptions", true);

                // Create a deep copy to add the client_id filter
                let clientFilterOptions = JSON.parse(JSON.stringify(filterOptions));
                clientFilterOptions.client_id = this.getReactively("filters.client.client_id");

                return clientFilterOptions;
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
                $scope.dataSource = [];

                this.spendingGrouped().forEach((spendThisGroup) => {
                    let clientValue;
                    let publicGroupValue = spendThisGroup._group[spendThisGroup.groupField];
                    this.clientSpendingGrouped().forEach((clientData) => {
                        if (spendThisGroup.organisation_name == clientData.organisation_name && spendThisGroup.groupField == clientData.groupField
                            && publicGroupValue == clientData._group[clientData.groupField]) {
                            clientValue = clientData.totalAmount;
                        }
                    });

                    let tempObj = {
                        organisationAndGroup: spendThisGroup.organisation_name + ' - ' + publicGroupValue,
                        publicValue: spendThisGroup.totalAmount,
                        clientValue: clientValue,
                        organisationName: spendThisGroup.organisation_name
                    };
                    $scope.dataSource.push(tempObj);
                });

                $scope.dataSource.sort(function (a, b) {
                    return a.publicValue - b.publicValue;
                });

                // Resize the chart according to the number of bars.
                // In current setup, the number of bars is always higher than the threshold.
                // let numBars = $scope.dataSource.length * this.getReactively("dataSeries").length;
                let numBars = $scope.dataSource.length * 2;

                if (numBars > 10) {
                    $scope.chartSize = {
                        height: 700
                    }
                } else {
                    $scope.chartSize = {
                        height: 500
                    }
                }

                $scope.chartOptionsDynamic = {
                    dataSource: $scope.dataSource.map(function (i) {
                        i.zero = 0;
                        return i;
                    }),
                    size: $scope.chartSize,
                };
                markSelectedSubFilter();
            },
            /**
             * Chart options that don't need to be reloaded when data changes.
             */
            chartOptions: () => {
                return {
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
            },
            chartSeries: () => {
                let dataSeries = [];
                
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

                $scope.getCollectionReactively("organisation_names").forEach((organisation_name) => {
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

                return dataSeries;
            },            
            filterPeriodName: () => {
                let filterName = this.getReactively("filterName");
                if (filterName)
                    filterName = 'Filter: ' + filterName + ', ';
                else
                    filterName = '';

                let category = this.getReactively("filters.procurement_classification_1");
                let categorySelection = this.getCollectionReactively('selectionFilter.category');
                let hasCategorySelection = categorySelection && categorySelection.length && this.groupDisplayName != "category";
                
                if (category || hasCategorySelection) {
                    filterName += 'Category: ';

                    if (category) {
                        category.$in.forEach((filter) => {
                            filterName += filter + ', ';
                        });
                    }

                    if (hasCategorySelection) {
                        categorySelection.forEach((filter) => {
                            filterName += filter + ', ';
                        });
                    }
                }

                let service = this.getReactively("filters.sercop_service");
                let serviceSelection = this.getCollectionReactively('selectionFilter.service');            
                let hasServiceSelection = serviceSelection && serviceSelection.length && this.groupDisplayName != "service";

                if (service || hasServiceSelection) {
                    filterName += 'Service: ';
                    if (service) {
                        service.$in.forEach((filter) => {
                            filterName += filter + ', ';
                        });
                    }

                    if (hasServiceSelection) {
                        serviceSelection.forEach((filter) => {
                            filterName += filter + ', ';
                        });
                    }
                }

                let supplierSelection = this.getCollectionReactively('selectionFilter.supplier');
                let hasSupplierSelection = supplierSelection && supplierSelection.length && this.groupDisplayName != "supplier";

                if (hasSupplierSelection) {
                    filterName += 'Supplier: ';
                    
                    supplierSelection.forEach((filter) => {
                        filterName += filter + ', ';
                    });
                }

                let supplier = this.getReactively("filters.supplier_contains");
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

                            let filterDate = this.getReactively('filterDate');
                
                            if (filterDate) {
                                startDate = filterDate.startDate.toDate();
                                endDate = filterDate.endDate.toDate();
                            }

                            let selDate = this.getReactively('selDate');                

                            if (selDate) {
                                startDate = selDate.startDate.toDate();
                                endDate = selDate.endDate.toDate();
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
                case 'service':
                    return self.selectionFilter.service;
                case 'supplier':
                    return self.selectionFilter.supplier;
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