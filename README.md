# User-Task-Queuing-with-Rate-Limiting
- A Node.js API cluster with 2 replica sets and a route to handle a simple task. The task has a rate limit of 1 task per second and 20 task per min for each user ID. 
- Users will hit the route to process tasks multiple times, a queueing system to ensure that tasks are processed 
according to the rate limit for each user ID.


[!NOTE]
- For the sake of complexity I've not implemented shared memory or databases like redis or sql, to make it to production level we have to add shared databases or memory for centralized access.
- Note that two replica does not know anything about another one, so if request is processed by one replica its request can go to another replica and IT IS violation of rate limiting.