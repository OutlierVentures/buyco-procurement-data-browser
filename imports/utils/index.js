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
        if ((filters[k] === null || filters[k] === "") || (filters[k] && filters[k].length === 0))
            delete filters[k];
    }
};

/**
 * Remove empty filter values from an array of filter objects, each for a single field.
 */
export const removeEmptyFiltersFromArray = (filters) => {
    for (let i = filters.length - 1; i >= 0; i--) {
        let filterClause = filters[i];

        let filterField = Object.keys(filterClause)[0];
        let filterValue = filterClause();

        // Take out empty values. We explicitly take out the empty string as a filter value,
        // because select boxes can pass them when an empty "-- select --" option is selected.
        if ((filterValue === null || filterValue === "") || (filtersValue && filterValue.length === 0))
            delete filters[i];
    }
};

/**
 * Return the color for an organisation series
 */
export const getColour = (organisationName) => {
    return stringToColour(organisationName);
}

export * from './tools';