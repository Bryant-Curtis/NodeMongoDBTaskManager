const { ObjectID } = require('mongodb')
const MongoPool = require('./mongo-pool');
const { COLLECTION } = require('./collection');
const { moveTasksToProcessing, moveTasksToTodoList } = require('./task-listeners');

MongoPool.initPool(null, {customerId: 1, insertedTime: 1}, null, { order: 1 });
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
            const customerIdCount = {};

            for (var i = 0; i < tasksToMoveToTodoList.length; i++) {
                const customerId = tasksToMoveToTodoList[i].customerId;

                if (customerIdCount.hasOwnProperty(customerId)) {
                    customerIdCount[customerId] += 1;
                } else {
                    customerIdCount[customerId] = 1;
                }
            }

            const customerIdCountIdList = Object.keys(customerIdCount);
            let tasksToMoveToProcessing = [];

            // NOTE: The TODO collection has a complex index of {customerId: 1, insertedTime: 1} on line 6,
            // and hence the below query is optimized to examine only the minimum number of documents
            // necessary to retrieve the least recently inserted tasks per customer.
            for (var i = 0; i < customerIdCountIdList.length; i++) {
                const customerId = customerIdCountIdList[i];
                const taskToMoveToProcessing = await db.collection(COLLECTION.TODO)
                                                        .find({ customerId: new ObjectID(customerId) })
                                                        .sort({ insertedTime: 1 })
                                                        .limit(customerIdCount[customerId])
                                                        .toArray();

                tasksToMoveToProcessing = tasksToMoveToProcessing.concat(taskToMoveToProcessing);
            }

            for (var i = 0; i < tasksToMoveToProcessing.length; i++) {
                console.log('task id planned to be added to PROCESSING collection', tasksToMoveToProcessing[i]._id);
            }

            await Promise.all(moveTasksToProcessing(tasksToMoveToProcessing));

            // NOTE: The below is purely a simple confirmation that the algorithm
            // is working as expected via logs to the console
            const processingTasksAfter = await db.collection(COLLECTION.PROCESSING).find().toArray();
            const customerIdCountInProcessing = {};

            for (var i = 0; i < processingTasksAfter.length; i++) {
                const customerId = processingTasksAfter[i].customerId;

                if (customerIdCountInProcessing.hasOwnProperty(customerId)) {
                    customerIdCountInProcessing[customerId] += 1;
                } else {
                    customerIdCountInProcessing[customerId] = 1;
                }
            }

            Object.keys(customerIdCountInProcessing).forEach(id => {
                console.log(`Customer with id ${id} has ${customerIdCountInProcessing[id]} task(s) in the PROCESSING list`);
            });

            const processingCountAfter = processingTasksAfter.length;
            console.log(`Moved ${processingCountAfter - processingCountBefore} task(s) from TODO list to PROCESSING list`);
        }
    });
}, 1000);
