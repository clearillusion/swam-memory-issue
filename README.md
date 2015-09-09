# Memory Issue of SWAM

The app demostrates the issue of the memory issue we're experiencing.

It will sync the dummy data from one of our dev server to the device, in local sqlite database backed by SWAM security architecture.

## How to run it
Under src-ext-native, run `"sencha app build"` & deploy it in a SWAM server. Due to the CORS issue, the app needs to be deployed using Versions. Configure a `"~/.sencha/cmd/sencha.cfg"` and run `"sencha app publish"` is recommended to streamline the process. Once the data is synced, the app could be deployed in a developer friendly mode, e.g serve the app via a web server.

## What it does
Once data is synced, it'll prompt a Form with a pre-populated query & some relavant fields. It is a typically scenario in our application: we run a query to grab a bunch of data involved, grouping them in a certain way & using the result to populate the grids & charts etc. Typically, the first query will return a fairly large result set, e.g several hundreds rows with 300+ columns each row, we never convert them to model or anything, just use the rows to do the grouping on JS side. The end result used for displaying will be small.

The meaning of each fields:
- `"Query"` - The first query to grab data involved
- `"Groups"` - The grouping logic that will happen on the rows returned by the first query
- `"Repeat"` - Repeat the query & grouping x number of times
- `"Result"` - Indicator to show if the above process is done

The query can either be executed using either Public SWAM API or P2 Customized API. As it goes, using some profiler tool, e.g Instruments to inspect the memory usage. It keeps climbing up even with some GC happens occasionally. Recommend to run it on a physical device as it's more restrictive.

Button 'Some UI Work' is to show the grids/charts making use of the grouping result.(In progress...)

Button 'Logout' is to break the app server session used for sync & promopt login.

## Additional
P2 customized proxy & transaction management:
- `"app/data/proxy/SecureSql.js"`
- `"app/space/SpaceSql.js"`