import angular from 'angular';

import { Meteor } from 'meteor/meteor';

import { name as ProcurementDataBrowser } from '../imports/ui/components/procurementDataBrowser/procurementDataBrowser';

function onReady() {
  angular.bootstrap(document, [
    ProcurementDataBrowser
  ], {
    strictDi: true
  });
}

if (Meteor.isCordova) {
  angular.element(document).on('deviceready', onReady);
} else {
  angular.element(document).ready(onReady);
}
