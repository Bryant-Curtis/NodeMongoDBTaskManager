# NodeMongoDBTaskManager
A Task Manager for automatically adding and removing tasks from collections according to different strategies

## Overview
The program is designed to execute one of a series of algorithms responsible for selecting tasks from a to-do list and transferring them to a processing list based on the algorithm's predefined rules. Tasks are programmed to reside within the processing list for a duration specified by the customer object linked to each task. After a task completes its processing cycle, indicated by the passage of time, the program automates the task's return to the to-do list, ensuring a continuous workflow within the system. The exact number of tasks undergoing processing at any given moment can fluctuate, depending on the algorithm currently in use.

### NOTE:
In order to run this program and have it function properly, one must set a `MAX_TASKS_PROCESSING` environment variable locally with a reasonable numeric value. One could start with 25 as a default value, and change the value on different runs of the various algorithms to observe a change in behavior of the program.
