function getTimeToReleaseTaskInMS(customer) {
    const rangeOfSeconds = customer.taskMaxSeconds - customer.taskMinSeconds;
    const randomizedSecondsToStayInProcessingList = Math.round(rangeOfSeconds * Math.random()) + customer.taskMinSeconds;
    const randomizedSecondsToStayInProcessingListInMS = randomizedSecondsToStayInProcessingList * 1000;

    return randomizedSecondsToStayInProcessingListInMS + Date.now();
}

module.exports = { getTimeToReleaseTaskInMS };
