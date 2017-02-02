

export class MetaDataHelper {
    getFieldDisplayName(entityName, fieldName) {
        switch (entityName) {
            case "public_spending":
                switch (fieldName) {
                    case "organisation_name":
                        return "organisation";
                    case "procurement_classification_1":
                        return "category";
                    case "sercop_service":
                        return "service";
                    case "supplier_name":
                        return "supplier";
                }
        }
        return null;
    }
}