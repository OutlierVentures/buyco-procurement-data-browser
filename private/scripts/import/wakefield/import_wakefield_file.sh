#!/bin/sh



../rethinkdb_import.sh "$1" bigchain.wakefield_import --no-header --custom-header organisation_name,organisation_code,effective_date,directorate,sercop_service,sercop_uri,supplier_name,buyer_supplier_id,company_registration,charity_registration,vcse_grant,payment_date,transaction_number,sequence_number,amount_net,amount_irrecoverable_vat,purpose,type,procurement_classification_1,class_code_1,procurement_classification_2,class_code_2,thomson_classification,thomson_description,contract_number
