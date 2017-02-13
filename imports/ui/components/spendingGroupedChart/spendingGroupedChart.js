import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularNvd3 from 'angular-nvd3';
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
            return [{
                organisation_name: this.getReactively("filters.organisation_name"),
                procurement_classification_1: this.getReactively("filters.procurement_classification_1"),
                sercop_service: this.getReactively("filters.sercop_service")
            },
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

            return SpendingGrouped.find(filters);
        }

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

                // console.log("spendingGroupChart '" + this.groupField + "': processing chart data. Filters are:", this.filters);

                let i = 0;
                this.spendingGrouped().forEach((spendThisGroup) => {
                    let xLabel;

                    // For grouped data, the data will look like this:
                    // {
                    //     "group": "CAPITAL PROGRAMME HRA",
                    //     "reduction": 59610752.69999999,
                    //     "organisation_name": "...",
                    //     ...
                    // }
                    // For the label we just use the "group" field.
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
            }

        });

        var pow = Math.pow, floor = Math.floor, abs = Math.abs, log = Math.log;

        function round(n, precision) {
            var prec = Math.pow(10, precision);
            return Math.round(n*prec)/prec;
        };

        function format(n) {
            var base = floor(log(abs(n))/log(1000));
            var suffix = 'kmb'[base-1];
            return suffix ? round(n/pow(1000,base),2)+suffix : ''+n;
        };

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

            // console.log($scope.dataSource.length);

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
                    customizeTooltip: function(arg) {
                        return {
                            text: arg.percentText + " - " + arg.valueText
                        };
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

        // $scope.chartOptions = {
        //     chart: {
        //         type: 'multiBarHorizontalChart',
        //         height: 450,
        //         margin: {
        //             top: 20,
        //             right: 20,
        //             bottom: 45,
        //             // We leave a lot of space on the left to show group values (e.g. category names, supplier names etc)
        //             left: 250
        //         },
        //         clipEdge: true,
        //         //staggerLabels: true,
        //         duration: 500,
        //         stacked: false,
        //         showControls: false,
        //         showValues: false,
        //         xAxis: {
        //             axisLabel: '',
        //             showMaxMin: false,
        //             tickFormat: function (d) {
        //                 if (!$scope.chartData || !$scope.chartData[0])
        //                     return;
        //                 var label = $scope.chartData[0].values[d].label;
        //                 return label;
        //             }
        //         },
        //         yAxis: {
        //             axisLabel: 'Amount',
        //             axisLabelDistance: 50,
        //             tickFormat: function (d) {
        //                 return d3.format(',.1f')(d / 1e6) + "M";
        //             }
        //         }
        //     }
        // };
    }
}

const name = 'spendingGrouped';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    angularNvd3
]).component(name, {
    template,
    controllerAs: name,
    bindings: {
        // Filters should contain field names to match as equal.
        filters: '<',
        // The field to group by. Valid values: procurement_classification_1, supplier_name, sercop_service.
        groupField: '<'
    },
    controller: SpendingGroupedChart
});