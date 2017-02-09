import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularNvd3 from 'angular-nvd3';
import uiRouter from 'angular-ui-router';

import template from './lineBarChartTest.html';

class LineBarChartTest {
    constructor($scope, $reactive) {
        'ngInject';

        $scope.options = {
            chart: {
                type: 'multiChart',
                height: 450,
                margin: {
                    top: 30,
                    right: 60,
                    bottom: 50,
                    left: 70
                },
                color: d3.scale.category10().range(),
                //useInteractiveGuideline: true,
                duration: 500,
                xAxis: {
                    tickFormat: function (d) {
                        return d3.format(',f')(d);
                    }
                },
                yAxis1: {
                    tickFormat: function (d) {
                        return d3.format(',.1f')(d);
                    }
                },
                yAxis2: {
                    tickFormat: function (d) {
                        return d3.format(',.1f')(d);
                    }
                }
            }
        };

        $scope.data = generateData();

        function generateData() {
            var testdata = stream_layers(2, 10 + Math.random() * 100, .1).map(function (data, i) {
                return {
                    key: 'Stream' + i,
                    values: data.map(function (a) { a.y = a.y * (i <= 1 ? 1 : 1); return a })
                };
            });

            testdata[0].type = "bar";
            testdata[0].yAxis = 1;
            testdata[1].type = "line";
            testdata[1].yAxis = 2;

            return testdata;
        }

        /* Inspired by Lee Byron's test data generator. */
        function stream_layers(n, m, o) {
            if (arguments.length < 3) o = 0;
            function bump(a) {
                var x = 1 / (.1 + Math.random()),
                    y = 2 * Math.random() - .5,
                    z = 10 / (.1 + Math.random());
                for (var i = 0; i < m; i++) {
                    var w = (i / m - y) * z;
                    a[i] += x * Math.exp(-w * w);
                }
            }
            return d3.range(n).map(function () {
                var a = [], i;
                for (i = 0; i < m; i++) a[i] = o + o * Math.random();
                for (i = 0; i < 5; i++) bump(a);
                return a.map(stream_index);
            });
        }

        function stream_index(d, i) {
            return { x: i, y: Math.max(0, d) };
        }

    }
}

const name = 'lineBarChartTest';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    angularNvd3,
]).component(name, {
    template,
    controllerAs: name,
    controller: LineBarChartTest
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('line-bar-chart-test', {
            url: '/chart-test/line-bar',
            template: '<line-bar-chart-test></line-bar-chart-test>'
        });
}
