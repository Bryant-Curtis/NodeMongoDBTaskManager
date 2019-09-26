const MongoPool = require('./mongo-pool');
const { COLLECTION } = require('./collection');
const { moveTasksToProcessing, moveTasksToTodoList } = require('./task-listeners');

MongoPool.initPool(null, {insertedTime: 1});
let seconds = 0;

setInterval(function () {
    console.log('');
    console.log(`${seconds++} seconds passed`);

    MongoPool.getInstance(async db => {
        const tasksToMoveToTodoList = await db.collection(COLLECTION.PROCESSING)
                                                .find({ timeToReleaseTaskInMS: { $lte: Date.now() } })
                                                .toArray();
        await Promise.all(moveTasksToTodoList(tasksToMoveToTodoList));

        for (var i = 0; i < tasksToMoveToTodoList.length; i++) {
            console.log('task id added to TODO collection', tasksToMoveToTodoList[i]._id)
        }

        tasksToMoveToTodoList.length > 0 && console.log(`Moved ${tasksToMoveToTodoList.length} task(s) from PROCESSING list to TODO list`);

        if (tasksToMoveToTodoList.length > 0) {
            const processingCountBefore = await db.collection(COLLECTION.PROCESSING).find().count();
            // NOTE: The TODO collection's "insertedTime" key has been indexed in ascending order on line 5,
            // and hence the below query is optimized to examine only the minimum number of documents
            // necessary to retrieve the first inserted tasks, up to the amount of the specified limit.
            const firstInsertedTasksToMoveToProcessing = await db.collection(COLLECTION.TODO)
                                                                    .find()
                                                                    .sort({insertedTime: 1})
                                                                    .limit(tasksToMoveToTodoList.length)
                                                                    .toArray();

            for (var i = 0; i < firstInsertedTasksToMoveToProcessing.length; i++) {
				console.log('task id planned to be added to PROCESSING collection', firstInsertedTasksToMoveToProcessing[i]._id)
			}

            await Promise.all(moveTasksToProcessing(firstInsertedTasksToMoveToProcessing));
            const processingCountAfter = await db.collection(COLLECTION.PROCESSING).find().count();

            console.log(`Moved ${processingCountAfter - processingCountBefore} task(s) from TODO list to PROCESSING list`);
        }
    });
}, 1000);

// db.inventory.createIndex({ quantity: 1 })
// db.inventory.insertMany([
//     { "_id" : 1, "item" : "f1", type: "food", quantity: 500 },
//     { "_id" : 2, "item" : "f2", type: "food", quantity: 100 },
//     { "_id" : 3, "item" : "p1", type: "paper", quantity: 200 },
//     { "_id" : 4, "item" : "p2", type: "paper", quantity: 150 },
//     { "_id" : 5, "item" : "f3", type: "food", quantity: 300 },
//     { "_id" : 6, "item" : "t1", type: "toys", quantity: 500 },
//     { "_id" : 7, "item" : "a1", type: "apparel", quantity: 250 },
//     { "_id" : 8, "item" : "a2", type: "apparel", quantity: 400 },
//     { "_id" : 9, "item" : "t2", type: "toys", quantity: 50 },
//     { "_id" : 10, "item" : "f4", type: "food", quantity: 75 }
// ]);
