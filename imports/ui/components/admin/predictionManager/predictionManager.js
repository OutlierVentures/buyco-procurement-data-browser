import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import utilsPagination from 'angular-utils-pagination';

import { Counts } from 'meteor/tmeasday:publish-counts';

import { PredictionRuns } from '/imports/api/predictionRuns';

import template from './predictionManager.html';

class PredictionManager {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        $scope.page = 1;
        $scope.perPage = 10;
        $scope.sort = { name_sort: 1 };
        $scope.orderProperty = '1';

        $scope.helpers({
            predictionRuns: function () {
                return PredictionRuns.find({}, {
                    sort: $scope.getReactively('sort')
                });
            },
            predictionRunCount: function () {                
                return Counts.get('predictionRunCount');
            }
        });

        $scope.subscribe('prediction_runs', function () {
            return [{
                sort: $scope.getReactively('sort'),
                limit: parseInt($scope.getReactively('perPage')),
                skip: ((parseInt($scope.getReactively('page'))) - 1) * (parseInt($scope.getReactively('perPage')))
            }, $scope.getReactively('search')];
        });

        $scope.pageChanged = function (newPage) {
            $scope.page = newPage;
        };

    }
}

const name = 'predictionManager';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    utilsPagination,
]).component(name, {
    template,
    controllerAs: name,
    controller: PredictionManager
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('predictionManager', {
            url: '/admin/prediction-manager',
            template: '<prediction-manager></prediction-manager>'
        });
}
