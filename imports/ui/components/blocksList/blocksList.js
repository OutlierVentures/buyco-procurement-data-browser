import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import utilsPagination from 'angular-utils-pagination';

import { Counts } from 'meteor/tmeasday:publish-counts';

import { Blocks } from '../../../api/blocks';


import template from './blocksList.html';

class BlocksList {
    constructor($scope, $reactive) {
        'ngInject';

        $reactive(this).attach($scope);

        $scope.page = 1;
        $scope.perPage = 3;
        $scope.sort = { name_sort: 1 };
        $scope.orderProperty = '1';

        $scope.helpers({
            blocks: function () {
                return Blocks.find({}, {
                    sort: $scope.getReactively('sort')
                });
            },
            blocksCount: function () {
                return Counts.get('blocksCount');
            }
        });

        $scope.subscribe('blocks', function () {
            return [{
                sort: $scope.getReactively('sort'),
                limit: parseInt($scope.getReactively('perPage')),
                skip: ((parseInt($scope.getReactively('page'))) - 1) * (parseInt($scope.getReactively('perPage')))
            }, $scope.getReactively('search')];
        });

        $scope.save = function () {
            if ($scope.form.$valid) {
                Blocks.insert($scope.newThing);
                $scope.newThing = undefined;
            }
        };

        $scope.remove = function (thing) {
            Blocks.remove({ _id: thing._id });
        };

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

const name = 'blocksList';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter,
    utilsPagination,
]).component(name, {
    template,
    controllerAs: name,
    controller: BlocksList
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('blocks', {
            url: '/blocks',
            template: '<blocks-list></blocks-list>'
        });
}
