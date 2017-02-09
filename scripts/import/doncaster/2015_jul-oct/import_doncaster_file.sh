#!/bin/sh

echo Importing doncaster file $1...

# Trim spaces (RethinkDB is not good at that)
cat "$1" | sed 's/        //g' | sed 's/    //g' | sed 's/    //g' | sed 's/  //g' | sed 's/  //g' | sed 's/  //g' | sed 's/  //g' | sed 's/ ,/,/g' | sed 's/ \$//g' > $1.preprocessed

../../rethinkdb_import.sh "$1.preprocessed" bigchain.doncaster_import --custom-header effective_date,transaction_number,directorate,sercop_service,service_division,supplier_name,procurement_classification_1,procurement_classification_2,amount_net,supplier_classification_1
