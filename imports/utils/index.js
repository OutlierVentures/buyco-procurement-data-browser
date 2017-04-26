import { MetaDataHelper as mdh } from './metaDataHelper';
import { stringToColour } from './style';

export const MetaDataHelper = new mdh();

/**
 * Remove empty filter values from a filter object to prevent filter values like 
 * the empty string from limiting the results.
 */
export const removeEmptyFilters = (filters) => {
    for (let k in filters) {
        // Take out empty values. We explicitly take out the empty string as a filter value,
        // because select boxes can pass them when an empty "-- select --" option is selected.
        if (filters[k] === null || filters[k] === "")
            delete filters[k];
    }
};

/**
 * Return the color for an organisation series
 */
export const getColour = (organisationName) => {
    return stringToColour(organisationName);
}