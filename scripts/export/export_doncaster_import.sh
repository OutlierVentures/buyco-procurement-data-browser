#!/bin/sh

rethinkdb export -e bigchain.doncaster_import --format csv --fields effective_date,transaction_number,directorate,sercop_service,service_division,supplier_name,procurement_classification_1,procurement_classification_2,amount_net,supplier_classification_1
