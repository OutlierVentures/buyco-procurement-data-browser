#!/bin/sh


tail -n +5 $1 | iconv -f "windows-1252" -t "UTF-8" |  sed 's/,,,,,,,,,,,,,,,,,,,,,,//g' | sed 's/,,,,,,,,,,,,,,,,,,,,//g' | sed 's/,,,,,,,,,,,,,,,,,,//g' > $1.preprocessed

../rethinkdb_import.sh $1.preprocessed bigchain.public_spending --no-header --custom-header organisation_name,organisation_code,effective_date,directorate,sercop_service,sercop_uri,supplier_name,buyer_supplier_id,company_registration,charity_registration,vcse_grant,payment_date,transaction_number,sequence_number,amount_net,amount_irrecoverable_vat,purpose,type,procurement_classification_1,class_code_1,procurement_classification_2,class_code_2,thomson_classification,thomson_description,contract_number
