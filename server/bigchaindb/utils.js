
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

    // Clean up the filter
    for (let k in filter) {
        if (filter[k] === undefined)
            delete filter[k];
    }

    if (filter) {
        pipeLine.push({ $match: filter });
    }

    let groupClause = {
        $group: {
            _id: '$' + sourceFieldName,
        }
    }

    groupClause.$group[sourceFieldName] = { $first: '$' + sourceFieldName };

    // Include the filtered fields in the result documents so the client can filter
    // them too.
    if (filter) {
        for (let k in filter) {
            if (filter[k] !== undefined)
                groupClause.$group[k] = { $first: '$' + k };
        }
    }

    pipeLine.push(groupClause);

    let sortClause = { "$sort": { [sourceFieldName]: 1 } };
    pipeLine.push(sortClause);

    // Call the aggregate
    let cursor = sourceCollection.aggregate(
        pipeLine
    ).forEach((doc) => {
        // Prepare the document for publishing. Start with a clone.
        let addedDoc = JSON.parse(JSON.stringify(doc));

        if (targetFieldName && targetFieldName != sourceFieldName) {
            delete addedDoc[sourceFieldName];
            addedDoc[targetFieldName] = doc[sourceFieldName];
        }

        // We add each document to the published collection so the subscribing client receives them.
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