// Postprocessing for Calderdale Borought data.
// Input format: result of Trifacta Wrangler with correct column names
// Output: data types are corrected
db.getCollection('public_spending').find({organisation_name: "The Borough of Calderdale"});

// Show dates
db.getCollection('public_spending')
    .find({organisation_name: "The Borough of Calderdale"})
    .forEach(function(doc){
        var parts = doc.effective_date.split("/");
        var dt = new Date(parseInt(parts[2], 10),
                          parseInt(parts[1], 10) - 1,
                          parseInt(parts[0], 10));
        print(doc.effective_date);
        print(dt);
    });
    
// Convert effective_date to date
db.public_spending
    .find({organisation_name: "The Borough of Calderdale"})
    .forEach(function(doc){
        if (typeof doc.effective_date !== 'string')
            return;
        
        var parts = doc.effective_date.split("/");
        var dt = new Date(parseInt(parts[2], 10),
                          parseInt(parts[1], 10) - 1,
                          parseInt(parts[0], 10));
        db.public_spending.update( { _id: doc._id }, { "$set": { effective_date: dt, payment_date: dt } });
    });

// Convert amount to number
db.public_spending
    .find({organisation_name: "The Borough of Calderdale"})
    .forEach(function(doc){
        if (typeof doc.amount_net !== 'string')
            return;
                
        db.public_spending.update( { _id: doc._id }, { "$set": { amount_net: Number(doc.amount_net) }});
    });
