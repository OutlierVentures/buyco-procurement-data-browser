/**
 * Created by mac on 5/4/17.
 */
/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

import { resetDatabase } from 'meteor/xolvio:cleaner';
import './publish.js';

if (Meteor.isServer) {
    describe('spendingPerTime', function () {
        beforeEach(function () {
            resetDatabase();
        });

        describe('publications', function () {
            beforeEach(function () {
            });

            it('publish spendingPerTime', function (done) {
            });
        });
    });
}
