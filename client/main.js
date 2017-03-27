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


/**
 * Load Google Analytics tracker.
 */
Meteor.startup(function(){
  // To disable Google analytics, uncomment the line below.
  // TODO: use Meteor.settings to enable/disable.
  // return;

  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  // UA-76730152-2 - PDW staging app
  ga('create', 'UA-76730152-2', 'auto');
  ga('send', 'pageview');

});
