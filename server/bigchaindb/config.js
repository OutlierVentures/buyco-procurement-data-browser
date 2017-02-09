export const Config = {
    host: process.env.RETHINKDB_HOST || 'localhost',
    port: 28015,
    db: 'bigchain',
    bigchainDb: {
        database: {
            // "mongodb" or "rethinkdb" (not supported)
            type: "mongodb",
            url: process.env.MONGO_BIGCHAINDB_URL || 'mongodb://localhost/bigchain',
        },
        // API of the BigchainDB service
        apiUrl: "",
    }
}
