import { PredictionRuns} from '/imports/api/predictionRuns';
import {Predictions} from '/imports/api/predictions';
import {Spending} from '/server/bigchaindb/spending';

export function executePredictionStep(predictionRunId) {
    if (Meteor.isServer) {
        console.log("executePredictionStep");
    }
}

Meteor.methods({
  executePredictionStep
});
