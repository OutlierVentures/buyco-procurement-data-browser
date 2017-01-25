#!/bin/sh

# No preprocessing necessary for Doncaster
copy $1 > $1.preprocessed

../rethinkdb_import.sh $1.preprocessed bigchain.public_spending --custom-header effective_date,directorate,sercop_service,service_division,supplier_name,procurement_classification_1,procurement_classification_2,amount_net,supplier_classification_1
