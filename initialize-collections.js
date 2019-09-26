const { ObjectID } = require('mongodb')

// Change the customer count and each respective task min and max seconds here
const customerTaskTimeRanges = [
  {taskMinSeconds: 2, taskMaxSeconds: 5},
  {taskMinSeconds: 4, taskMaxSeconds: 8},
  {taskMinSeconds: 5, taskMaxSeconds: 10},
  {taskMinSeconds: 8, taskMaxSeconds: 13},
  {taskMinSeconds: 10, taskMaxSeconds: 15}
];

const customerIds = customerTaskTimeRanges.map(() => new ObjectID());

function initializeTasks() {
    const tasks = [];
    const insertedTime = new Date('2019-09-10T10:00:00.000Z');

    for (let i = 0; i < (customerTaskTimeRanges.length * 30); i++) {
        tasks.push({
            customerId: customerIds[i % customerIds.length],
            insertedTime: insertedTime.toISOString()
        });

        insertedTime.setSeconds(insertedTime.getSeconds() + 5);
    }

    return tasks;
}

function initializeCustomers() {
  return customerTaskTimeRanges.map((customerTaskTimeRange, i) => ({
    _id: customerIds[i],
    nextInLine: i === 0,
    order: i,
    taskMinSeconds: customerTaskTimeRange.taskMinSeconds,
    taskMaxSeconds: customerTaskTimeRange.taskMaxSeconds
  }));
}

module.exports = {
    initializedTaskList: initializeTasks(),
    initializedCustomerList: initializeCustomers()
}
