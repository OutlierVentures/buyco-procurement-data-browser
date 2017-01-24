import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import utilsPagination from 'angular-utils-pagination';

import { Counts } from 'meteor/tmeasday:publish-counts';

import { Spending } from '../../../api/spending';

import template from './spendingList.html';

class SpendingList {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        $scope.page = 1;
        $scope.perPage = 10;
        $scope.sort = { name_sort: 1 };
        $scope.orderProperty = '1';

        $scope.helpers({
            spending: function () {
                return Spending.find({}, {
                    sort: $scope.getReactively('sort')
                });
            },
            spendingTransactionsCount: function () {
                // TODO: make count work.
                return 66453;
                // return Counts.get('spendingTransactionsCount');
            }
        });

        $scope.subscribe('spending', function () {
            return [{
                sort: $scope.getReactively('sort'),
                limit: parseInt($scope.getReactively('perPage')),
                skip: ((parseInt($scope.getReactively('page'))) - 1) * (parseInt($scope.getReactively('perPage')))
            }, $scope.getReactively('search')];
        });

        $scope.pageChanged = function (newPage) {
            $scope.page = newPage;
        };

        return $scope.$watch('orderProperty', function () {
            if ($scope.orderProperty) {
                $scope.sort = {
                    name_sort: parseInt($scope.orderProperty)
                };
            }
        });
    }
}

const name = 'spendingList';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    utilsPagination,
]).component(name, {
    template,
    controllerAs: name,
    controller: SpendingList
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('spending', {
            url: '/spending',
            template: '<spending-list></spending-list>'
        });
}
