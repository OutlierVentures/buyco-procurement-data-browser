import angular from 'angular';
import angularMeteor from 'angular-meteor';
// import angularNvd3 from 'angular-nvd3';
import uiRouter from 'angular-ui-router';

import template from './spendingGroupedChart.html';

import { SpendingGrouped } from '../../../api/spendingGrouped';
import { MetaDataHelper } from '../../../utils';

class SpendingGroupedChart {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        $scope.dataSource = [];

        // The subscribe triggers calls to the spendingGroup collection when any of the bound values
        // change. On initialisation, the values are empty and a call is executed anyway. This is handled
        // on the server: if groupField is empty, no data will be returned.
        $scope.subscribe('spendingGrouped', () => {
            console.log('grouped chart');
            var temp = this.getReactively("filters.period");
            let filterOptions = {
                organisation_name: this.getReactively("filters.organisation_name"),
                procurement_classification_1: this.getReactively("filters.procurement_classification_1"),
                sercop_service: this.getReactively("filters.sercop_service")
            };

            if(this.getReactively('filterDate')) {
               filterOptions.effective_date = {$gt: this.getReactively("filterDate").startDate.toDate(), $lt: this.getReactively("filterDate").endDate.toDate()};
            }

            if(this.getReactively('selDate')) {
               filterOptions.effective_date = {$gt: this.getReactively("selDate").startDate.toDate(), $lt: this.getReactively("selDate").endDate.toDate()};
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

            // The filter values can be "" when the empty item is selected. If we apply that, no rows will be shown,
            // while all rows should be shown. Hence we only add them if they have a non-empty value.
            if (this.getReactively("filters.procurement_classification_1"))
                filters.procurement_classification_1 = this.getReactively("filters.procurement_classification_1");
            if (this.getReactively("filters.sercop_service"))
                filters.sercop_service = this.getReactively("filters.sercop_service");

                var temp = this.getReactively("filters.period");
            return SpendingGrouped.find(filters);
        };

        $scope.helpers({
            isLoggedIn: function () {
                return Meteor.userId() != null;
            },
            groupDisplayName: () => {
                return MetaDataHelper.getFieldDisplayName("public_spending", this.getReactively("groupField"));
            },
            spendingGrouped: () => {
                return this.spendingGrouped();
            },
            chartData: () => {
                var publicValues = [];
                let i = 0;
                this.spendingGrouped().forEach((spendThisGroup) => {
                    let xLabel;
                    xLabel = spendThisGroup._group;

                    let yVal = spendThisGroup.totalAmount;
                    publicValues.push({ x: i, label: xLabel, y: yVal, source: spendThisGroup });

                    i++;
                });

                $scope.publicSpendingData = {
                    key: this.getReactively("filters.organisation_name"),
                    color: '#1f77b4',
                    values: publicValues
                };

                $scope.$broadcast('chartRefresh', $scope.publicSpendingData);

                let dataSeries = [$scope.publicSpendingData];

                loadSpendingGroupChartData();
                return dataSeries;
            },
            filterPeriodName: () => {
                return this.getReactively("filterName");
            }
        });

        function loadSpendingGroupChartData() {
            $scope.dataSource = [];
            $scope.publicSpendingData.values.forEach((data) => {
               $scope.dataSource.push(
                   {
                       label : data.label,
                       chartValue : data.y
                   }
               );
            });

            $scope.dataSource.sort(function (a, b) {
                return a.chartValue - b.chartValue;
            });

            if($scope.dataSource.length > 10) {
                $scope.chartSize = {
                    height: 700
                }
            } else {
                $scope.chartSize = {
                    height: 500
                }
            }

            $scope.dataSeries = [{
                    valueField: "chartValue",
                    name: $scope.publicSpendingData.key,
                    stack: "male",
                    color: 'rgb(255, 170, 102)'
                },{
                    valueField: 'zero',
                    type: 'scatter',
                    point: {
                        color: 'none'
                    },
                    showInLegend: false,
                    label: {
                        visible: true,
                        font: {
                            color: 'gray'
                        },
                        customizeText: function(e) {
                            return e.argumentText;
                        }
                    }
            }];

            $scope.chartOptions = {
                dataSource: $scope.dataSource.map(function(i){
                    i.zero = 0;
                    return i;
                }),                
                commonSeriesSettings: {
                    argumentField: "label",
                    type: "bar"
                },
                argumentAxis: {            
                    label: {
                        visible: false,
                        format: "largeNumber"
                    }
                },
                rotated: true,
                series: $scope.dataSeries,
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
                        var items = arg.points[0].valueText.split("\n"),
                            color = arg.point.getColor();
                        var tempItem = '';
                        tempItem += arg.argument + ' ';
                        tempItem += items;
                        $.each(items, function(index, item) {
                            if(item.indexOf(arg.points[0].valueText) === 0) {
                                items[index] = $("<b>")
                                                .text(tempItem)
                                                .css("color", color)
                                                .prop("outerHTML");
                            }
                        });
                        return { text: items.join("\n") };
                    }
                },
                valueAxis: [{
                    label: {
                        format: "largeNumber"
                    }
                }],
                size: $scope.chartSize
            };
        }
    }
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
        // Filters should contain field names to match as equal.
        filters: '<',
        // The field to group by. Valid values: procurement_classification_1, supplier_name, sercop_service.
        groupField: '<',
        filterDate: '<',
        selDate: '<',
        filterName: '<'
    },
    controller: SpendingGroupedChart
});