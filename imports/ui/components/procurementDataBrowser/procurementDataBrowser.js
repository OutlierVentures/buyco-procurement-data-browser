import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import template from './procurementDataBrowser.html';
import { name as BlocksList } from '../blocksList/blocksList';
import { name as ChartTest } from '../chartTest/chartTest';
import { name as SpendingList } from '../spendingList/spendingList';
import { name as SpendingPerMonthList } from '../spendingPerMonthList/spendingPerMonthList';
import { name as Importer } from '../importer/importer';
import { name as Navigation } from '../navigation/navigation';

class ProcurementDataBrowser {}

const name = 'procurementDataBrowser';

// create a module
export default angular.module(name, [
  angularMeteor,
  uiRouter,
  ChartTest,
  BlocksList,
  SpendingList,
  SpendingPerMonthList,
  Importer,
  Navigation,
  'accounts.ui'
]).component(name, {
  template,
  controllerAs: name,
  controller: ProcurementDataBrowser
})
  .config(config)
  .run(run);

function config($locationProvider, $urlRouterProvider, $qProvider) {
  'ngInject';

  $locationProvider.html5Mode(true);

  $urlRouterProvider.otherwise('/spending');

  $qProvider.errorOnUnhandledRejections(false);
}

function run($rootScope, $state) {
  'ngInject';

  $rootScope.$on('$stateChangeError',
    (event, toState, toParams, fromState, fromParams, error) => {
      if (error === 'AUTH_REQUIRED') {
        $state.go('spending');
      }
    }
  );
}
