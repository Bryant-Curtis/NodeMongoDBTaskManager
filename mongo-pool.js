const { MongoClient } = require('mongodb');
const { CONNECTION_URL } = require('./constants');
const { COLLECTION } = require('./collection');
const { initializedTaskList, initializedCustomerList } = require('./initialize-collections');
const { getTimeToReleaseTaskInMS } = require('./common');

const options = {
	numberOfRetries : 5,
	auto_reconnect: true,
	poolSize : 40,
	connectTimeoutMS: 500,
	useNewUrlParser: true,
	useUnifiedTopology: true
};

function MongoPool() {}

let p_db;

function initPool(cb, todoIndexCriteria, processingIndexCriteria, customerIndexCriteria) {
	return new Promise(resolve => {
		return MongoClient.connect(CONNECTION_URL, options, async function(err, client) {
			const db = client.db('task-runner');
			if (err) {
				throw err;
			}

			if (!p_db) {
				p_db = db;

				// Remove all values from collections in case somehow data was cached or DB did not reset properly
				await db.collection(COLLECTION.CUSTOMER).deleteMany();
				await db.collection(COLLECTION.PROCESSING).deleteMany();
				await db.collection(COLLECTION.TODO).deleteMany();

				// Format and insert sample data into all collections
				await db.collection(COLLECTION.CUSTOMER).insertMany(initializedCustomerList);
				const addToProcessingCollectionCount = initializedTaskList.slice(0, Math.floor(initializedTaskList.length / 3)).length;

				for (var i = 0; i < addToProcessingCollectionCount; i++) {
					const task = initializedTaskList[i];
					const customer = await db.collection(COLLECTION.CUSTOMER).findOne({ _id: task.customerId });
					task.timeToReleaseTaskInMS = getTimeToReleaseTaskInMS(customer);
				}

				await db.collection(COLLECTION.PROCESSING).insertMany(initializedTaskList.slice(0, addToProcessingCollectionCount));
				await db.collection(COLLECTION.TODO).insertMany(initializedTaskList.slice(addToProcessingCollectionCount));
			}

			// Set collection indexes
			todoIndexCriteria && await db.collection(COLLECTION.TODO).createIndex(todoIndexCriteria);
			processingIndexCriteria && await db.collection(COLLECTION.PROCESSING).createIndex(processingIndexCriteria);
			customerIndexCriteria && await db.collection(COLLECTION.CUSTOMER).createIndex(customerIndexCriteria);

			if (cb && typeof(cb) === 'function') {
				cb(p_db);
			}

			resolve(p_db);
		});
	});
}

MongoPool.initPool = initPool;

function getInstance(cb) {
    if (!p_db) {
        initPool(cb);
    } else if (cb && typeof(cb) === 'function') {
        return cb(p_db);
    }
}

MongoPool.getInstance = getInstance;

module.exports = MongoPool;
