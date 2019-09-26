const MongoPool = require('./mongo-pool');
const { COLLECTION } = require('./collection');
const { getTimeToReleaseTaskInMS } = require('./common');
const maxTasksAllowedInProcessing = process.env.MAX_TASKS_PROCESSING;

function moveTasksToProcessing(taskList) {
    return MongoPool.getInstance(db => {
        return taskList.map(task => {
            return new Promise(async resolve => {
                const processingCount = await db.collection(COLLECTION.PROCESSING).find().count();

                if (processingCount < maxTasksAllowedInProcessing) {
                    const customer = await db.collection(COLLECTION.CUSTOMER).findOne({ _id: task.customerId });
                    task.timeToReleaseTaskInMS = getTimeToReleaseTaskInMS(customer);
                    const insertTaskResult = await db.collection(COLLECTION.PROCESSING).insertOne(task);

                    if ((insertTaskResult || {}).insertedCount !== 1) {
                        throw `Error in writing task ${task._id} to PROCESSING collection`;
                    }

                    const deleteTaskResult = await db.collection(COLLECTION.TODO).deleteOne({ _id: task._id });

                    if ((deleteTaskResult || {}).deletedCount !== 1) {
                        throw `Error in deleting task ${task._id} from TODO collection`;
                    }
                }

                resolve(true);
            });
        });
    });
}

function moveTasksToTodoList(taskList) {
    return MongoPool.getInstance(db => {
        return taskList.map(task => {
            return new Promise(async resolve => {
                delete task.timeToReleaseTaskInMS;
                task.insertedTime = new Date().toISOString();
                const insertTaskResult = await db.collection(COLLECTION.TODO).insertOne(task);

                if ((insertTaskResult || {}).insertedCount !== 1) {
                    throw `Error in writing task ${task._id} to TODO collection`;
                }

                const deleteTaskResult = await db.collection(COLLECTION.PROCESSING).deleteOne({ _id: task._id });

                if ((deleteTaskResult || {}).deletedCount !== 1) {
                    throw `Error in deleting task ${task._id} from PROCESSING collection`;
                }

                resolve(true);
            });
        });
    });
}

module.exports = { moveTasksToProcessing, moveTasksToTodoList };
