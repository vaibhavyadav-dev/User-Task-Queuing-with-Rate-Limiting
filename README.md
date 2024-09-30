# User-Task-Queuing-with-Rate-Limiting
- A Node.js API cluster with 2 replica sets and a route to handle a simple task. The task has a rate limit of 1 task per second and 20 task per min for each user ID. 
- Users will hit the route to process tasks multiple times, a queueing system to ensure that tasks are processed 
according to the rate limit for each user ID.
- Implementation with rate limiting with Redis in a multi-replica setup, Redis act as a centralized in-memory data store that ensures consistent rate limiting and task queuing across all replicas (worker nodes). Redis allows replicas to share information about user activity, enforcing rate limits globally across the cluster.

> [!NOTE] 
> - This file has been modified with CHATGPT, although the structure has been preserved, as original to keep things simple. Hope you like it.