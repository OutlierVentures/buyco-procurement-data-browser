import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import template from './importer.html';

class Importer {
    constructor($scope, $reactive) {
        'ngInject';
    }
}

const name = 'importer';

// create a module
export default angular.module(name, [
    angularMeteor,
    uiRouter
]).component(name, {
    template,
    controllerAs: name,
    controller: Importer
})
    .config(config);

function config($stateProvider) {
    'ngInject';
    $stateProvider
        .state('importer', {
            url: '/import',
            template: '<importer></importer>'
        });
}
