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

            // The TODO collection has a complex index of {customerId: 1, insertedTime: 1} set on line 6,
            // and hence the below query is optimized to examine only the minimum number of documents
            // necessary to retrieve the least recently inserted tasks per customer.
            let tasksToMoveToProcessing = [];
            const customerNextInLineToStart = await db.collection(COLLECTION.CUSTOMER).findOne({ nextInLine: true });
            let customerNextInLine = customerNextInLineToStart;
            console.log('customer to start order number', customerNextInLineToStart.order);
            const allCustomersList = await db.collection(COLLECTION.CUSTOMER).find().toArray();
            const customerIdTaskToAddCount = {};
            const customerIdOrderMapping = {}; // This is used purely for easier visualization in console logs

            // Pre-process how many of which customer's tasks to add to PROCESSING list
            for (var i = 0; i < tasksToMoveToTodoList.length; i++) {
                const customerId = customerNextInLine._id;

                if (customerIdTaskToAddCount.hasOwnProperty(customerId)) {
                    customerIdTaskToAddCount[customerId] += 1;
                } else {
                    customerIdTaskToAddCount[customerId] = 1;
                }

                customerIdOrderMapping[customerId] = customerNextInLine.order;

                const nextCustomerOrderNumber = (customerNextInLine.order + 1) % allCustomersList.length;
                customerNextInLine = await db.collection(COLLECTION.CUSTOMER)
                                                .find({ order: nextCustomerOrderNumber })
                                                .toArray();
                customerNextInLine = customerNextInLine[0];
            }

            const customerIdCountIdList = Object.keys(customerIdTaskToAddCount);

            // Query and consolidate tasks to add to PROCESSING list
            for (let i = 0; i < customerIdCountIdList.length; i++) {
                const customerId = customerIdCountIdList[i];
                const taskToMoveToProcessing = await db.collection(COLLECTION.TODO)
                                                        .find({ customerId: new ObjectID(customerId) })
                                                        .sort({ insertedTime: 1 })
                                                        .limit(customerIdTaskToAddCount[customerId])
                                                        .toArray();

                tasksToMoveToProcessing = tasksToMoveToProcessing.concat(taskToMoveToProcessing);
                console.log(`Adding ${taskToMoveToProcessing.length} tasks for customer with order number ${customerIdOrderMapping[customerId]}`)
            }

            // This is to update the next customer in line for the next run
            if (customerNextInLine.nextInLine !== true) {
                await db.collection(COLLECTION.CUSTOMER).updateOne(
                    { _id: customerNextInLineToStart._id },
                    {
                        $set: { nextInLine: false }
                    }
                );
                await db.collection(COLLECTION.CUSTOMER).updateOne(
                    { _id: customerNextInLine._id },
                    {
                        $set: { nextInLine: true }
                    }
                );
            }

            for (var i = 0; i < tasksToMoveToProcessing.length; i++) {
                console.log('task id planned to be added to PROCESSING collection', tasksToMoveToProcessing[i]._id);
            }

            // Add all round-robin ordered tasks to PROCESSING list
            await Promise.all(moveTasksToProcessing(tasksToMoveToProcessing));
            const processingCountAfter = await db.collection(COLLECTION.PROCESSING).find().count();

            console.log(`Moved ${processingCountAfter - processingCountBefore} task(s) from TODO list to PROCESSING list`);
        }
    });
}, 1000);
