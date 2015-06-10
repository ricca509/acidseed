# acidseed
An API cache layer implemented in [Node.js](https://nodejs.org/) > 0.12 and [Redis](http://redis.io/).

## Why you may want to use it
You want to cache the result of your API call at `yourservice.io/api/users/123`.

## How you use it
 - Deploy `acidseed` where you want (say `cache.yourservice.io`).
 - Start it passing a port (default is `8181`) and a redis url (default is `redis://localhost:6379`):

 ```
 $ PORT=8383 REDIS_URL="redis://localhost:6379" node --harmony server.js
 ```
 - Instead of calling `yourservice.io/api/users/123`, call

 ```
 cache.yourservice.io?apiUrl=yourservice.io%2Fapi%2Fusers%2F123
 ```
 (always *encode* the url)

 Want to **skip** the cache? (useful if you want to give your user the ability to check the result in real time)

 ```
 cache.yourservice.io?apiUrl=yourservice.io%2Fapi%2Fusers%2F123&noCache=true
 ```

**Note:** the service will only cache responses with HTTP status code === 200;
