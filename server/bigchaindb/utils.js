
/**
 * Publish the unique values of a field in a source collection as a new collection.
 * To be called from a Meteor.publish() function.
 * 
 * @param publishFunction the publish function itself, i.e. "this" within the publish function
 * @param collectionName Name for the new collection to be published, e.g. "myNewCollection"
 * @param sourceCollection Source collection object, Mongo.Collection
 * @param filter Filter object as key: value. Example: { firstName: "John" }
 * @param sourceFieldName The field in the datasource to take the unique values form, for example "lastName"
 * @param targetFieldName Optional alternative field name to be used in the collection docs, for example "name"
 */
export const publishUniqueValues = (publishFunction, collectionName, sourceCollection, filter, sourceFieldName, targetFieldName) => {
    let pipeLine = [];

    if (filter) {
        pipeLine.push({ $match: filter });
    }

    let groupClause = {
        $group: {
            _id: '$' + sourceFieldName,
        }
    }

    groupClause.$group[sourceFieldName] = { $first: '$' + sourceFieldName };

    pipeLine.push(groupClause);

    if (!targetFieldName)
        targetFieldName = sourceFieldName;

    let cursor = sourceCollection.aggregate(
        pipeLine
    ).forEach((doc) => {
        let addedDoc = {};
        addedDoc[targetFieldName] = doc[sourceFieldName];

        publishFunction.added(collectionName, doc[sourceFieldName], addedDoc);
    });

    // Stop observing the cursor when client unsubs.
    // Stopping a subscription automatically takes
    // care of sending the client any removed messages.
    publishFunction.onStop(() => {
        if (cursor)
            cursor.stop();
    });

    publishFunction.ready();
}