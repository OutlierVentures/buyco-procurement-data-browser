/**
 * Javascript implementation of Java's string.hashCode()
 * Source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
String.prototype.hashCode = function () {
    var hash = 0,
        strlen = this.length,
        i,
        c;
    if (strlen === 0) {
        return hash;
    }
    for (i = 0; i < strlen; i++) {
        c = this.charCodeAt(i);

        hash = ((hash << 5) - hash) + c;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

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

export const publishUniqueValues = (publishFunction, collectionName, sourceCollection, filters, sourceFieldName, targetFieldName) => {
    let pipeLine = [];

    removeEmptyFilters(filters);

    let matchClause = {};

    if (filters) {
        matchClause.$match = filters;
    }

    if (!matchClause.$match || !matchClause.$match[sourceFieldName])
        matchClause.$match[sourceFieldName] = { $exists: true };

    pipeLine.push(matchClause);

    let groupClause = {
        $group: {
            _id: '$' + sourceFieldName,
        }
    }

    groupClause.$group[sourceFieldName] = { $first: '$' + sourceFieldName };

    // Include the filtered fields in the result documents so the client can filter
    // them too.
    if (filters) {
        for (let k in filters) {
            if (filters[k] !== undefined)
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



export const publishUniqueValuesForOrganisation = (publishFunction, collectionName, sourceCollection, groupbyField, sourceFieldName, targetFieldName) => {
    let pipeLine = [];

    let matchClause = {};

    if (!matchClause.$match || !matchClause.$match[sourceFieldName])
    {
        if(!matchClause.$match)
        {
            matchClause.$match = {};
        }
        matchClause.$match[sourceFieldName] = { $exists: true };
    }

    pipeLine.push(matchClause);

    let groupClause = {
        $group: {
            _id: {
                sourceFieldName: '$' + sourceFieldName,
                groupbyField: '$' + groupbyField,
            }
        }
    }

    groupClause.$group[sourceFieldName] = { $first: '$' + sourceFieldName };
    groupClause.$group[groupbyField] = { $first: '$' + groupbyField };

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

/**
 * Remove empty filter values from a filter object.
 */
export const removeEmptyFilters = (filters) => {
    for (let k in filters) {
        // Take out empty values. We explicitly take out the empty string as a filter value,
        // because select boxes can pass them when an empty "-- select --" option is selected.
        if (filters[k] === null || filters[k] === "")
            delete filters[k];
    }
};