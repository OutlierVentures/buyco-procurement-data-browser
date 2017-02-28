// Postprocessing for result JSON sets from Trifacta Wrangler.
// Input format: result of Trifacta Wrangler with correct column names
// Output: data types are corrected
//db.getCollection('public_spending').find({ organisation_name: "The Borough of Calderdale" });

// Show dates
// db.getCollection('public_spending')
//     .find({ organisation_name: "The Borough of Calderdale" })
//     .forEach(function (doc) {
//         var parts = doc.effective_date.split("/");
//         var dt = new Date(parseInt(parts[2], 10),
//             parseInt(parts[1], 10) - 1,
//             parseInt(parts[0], 10));
//         print(doc.effective_date);
//         print(dt);
//     });

// We use a function to be able to copy/paste multiline queries in Mongo shell.
// COULD DO: create meteor app to automate this process instead of the manual
// copy/paste action.

/**************************************
* COPY/PASTE THE BELOW IN MONGO SHELL *
**************************************/
function updateTrifactaData() {
    // Convert effective_date to date
    db.public_spending
        .find({ effective_date: { $type: "string" } })
        .forEach(function (doc) {
            var parts = doc.effective_date.split("/");
            var dt = new Date(parseInt(parts[2], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[0], 10));
            db.public_spending.update({ _id: doc._id }, { "$set": { effective_date: dt } });
        });

    // payment_date to date
    db.public_spending
        .find({ payment_date: { $type: "string" } })
        .forEach(function (doc) {
            var parts = doc.payment_date.split("/");
            var dt = new Date(parseInt(parts[2], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[0], 10));
            db.public_spending.update({ _id: doc._id }, { "$set": { payment_date: dt } });
        });

    // Convert amount to number
    db.public_spending
        .find({ amount_net: { $type: "string" } })
        .forEach(function (doc) {
            db.public_spending.update({ _id: doc._id }, { "$set": { amount_net: Number(doc.amount_net) } });
        });
}

updateTrifactaData();

