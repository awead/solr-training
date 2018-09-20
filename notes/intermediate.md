# Intermediate Solr Training

## Architecture

### Master and Slave Setups

* In master/slave setups, the master does not know about the slave. The slave just polls the master
for updates.
* Solr cloud seems to offer more than master/slave setups.
* core must be present in each, which includes configs and data directory

### Zookeeper

Enables multiple Solr instances to communicate with each other

* use at least 3
* one zookeeper is in control
* have them on separate servers so that the ZK server and control the other solr servers

### Sharding

* each shard has a primary and a replica
* primary shards calculate the index hash and indexes (?)
* replicas store the complete index
* one shard is designated as a leader
* different shards can be promoted to leaders if another becomes unavailable
* transaction logs on each shard enable a shard to recreate its indexes if one goes down
* zookeeper coordinates the process
* builds off of similar features in the master/slave setup
* there are multiple replica types

## Spatial Search

* bounding boxes, circles, or bounding shapes
* supports boosting by distance
* four point types
  * point - requires dynamic fields defined, can support more the 2 dimensions
  * location
    * does not require dynamic fields
    * docValues needs to be on - assists with searching and lowers memory footprint for faceting
  * location_rpt (recursive prefix tree)
    * allows for heatmap facets
    * higher precision with distErrPct and maxDistErr create large indexes
    * if you don't need heat map facets, location is sufficient
  * BBox (bounding box)
    * can be any kind of shape

### Setup

Note: Zookeeper port defaults to 100 + the default, so 9983.

    solr zk upconfig -z localhost:9983 -n training -d solr/training/conf
    cd solr
    ./index.sh

### Exercises

Preface with `http://localhost:8983/solr/training/select?`

Documents within a 50 km radius of 40.00,74.00:

    q=*:*&fq={!geofilt}&sfield=geo_location&pt=40.00,74.00&d=50&sort=geodist() asc

Documents sorted by distance from point 40.00,74.00

    q={!func}geodist()&sfield=geo_location&pt=40.00,74.00&sort=score asc

All documents, with those boosted by distance from point 40.00,74.00 with the radius of 1000

    q=*:*&fq={!geofilt}&sfield=geo_location&pt=40.00,74.00&d=1000&bf=recip(geodist(),2,200,20)&sort=score desc

### Other Example Queries

    q=*:*&fq={!geofilt sfield=geo_location}&pt=40.00,74.00&d=50

    q=*:*&fq={!bbox sfield=geo_location}&pt=40.00,74.00&d=50

    q={!func}geodist()&sfield=geo_location&pt=40.00,74.00&sort=score asc

    q=*:*&fq={!geofilt}&sfield=geo_location&pt=40.00,74.00&d=1000&sort=geodist() asc

    q=*:*&sfield=geo_location&pt=40.00,74.00&facet=true&facet.query={!frange l=0 u=100}geodist()&facet.query={!frange l=100.001 u=1000}geodist()

    q=*:*&rows=0&facet=true&facet.heatmap=geo_location_rpt

    q=*:*&rows=0&facet=true&facet.heatmap=geo_location_rpt&facet.heatmap.geom=[-10 -10 TO 10 10]

    q=*:*&rows=0&facet=true&facet.heatmap=geo_location_rpt&facet.heatmap.format=png


## Documents By Grouping

  * Only returns one document per group by default, use limit to change
  * group.func doesn't work in SolrCloud unless you have only one shard
  * group.query to group by a solr query
  * `group.limit=2&group.offset=1` returns only the second document from each group, or an empty group if there was only one document.
  * ngroups is the total number of groups
  * rows and start control which groups are shown
    * ex. `rows=1&start=0 shows` only the first group
  * regular sort affects the sorting of the groups, not their members
  * using collapse is a hack way of getting grouping
    * ex: `q=*:*&fq={!collapse field=uploaded_by}&expand=true`

### Exercises

1. q=*:*&group=true&group.field=uploaded_by
2.
3. q=*:*&group=true&group.field=uploaded_by&group.limit=2
4. q=*:*&group=true&group.field=uploaded_by&group.limit=2&group.sort=views desc
5. q=*:*&group=true&group.query=tags:solr&group.query=tags:elasticsearch
6. q=*:*&group=true&group.field=uploaded_by&group.ngroups=true
7. q=*:*&group=true&group.field=uploaded_by&facet=true&facet.field=tags&group.facet=true
8. q=*:*&group=true&group.field=uploaded_by&facet=true&facet.field=tags&group.facet=true&group.truncate=true
9. q=*:*&fq={!collapse field=uploaded_by}
10. q=*:*&fq={!collapse field=uploaded_by}&expand=true

## Relations

Use relation directory for sample data

Child queries can return the child documents from join queries.

### Load Data

    solr zk upconfig -z localhost:9983 -n relations -d solr/relations/conf

### Sample Queries

#### With Nested Documents

    http://localhost:8983/solr/relations/select?q={!child of=doc_type:tshirt}title:fancy

    http://localhost:8983/solr/relations/select?q={!parent which=doc_type:tshirt}color:red

    http://localhost:8983/solr/relations/select?q.op=AND&q={!parent which=doc_type:tshirt}(color:red size:XL)

    http://localhost:8983/solr/relations/select?q.op=AND&q={!parent which=doc_type:tshirt}(color:red size:L)

#### With Parent/Child Joins

    http://localhost:8983/solr/relations/select?q={!join from=parent_id to=id}size:XL

    http://localhost:8983/solr/relations/select?q={!join from=parent_id to=id}(size:XL color:red)&q.op=AND

    http://localhost:8983/solr/relations/select?q={!join from=parent_id to=id}(size:XL color:blue)&q.op=AND

    http://localhost:8983/solr/relations/select?q={!join from=parent_id to=id}(size:XL color:blue)&q.op=AND&fl=*,children:[subquery]&children.q={!terms f=parent_id v=$row.id}

### Exercises

#### Nested Documents

    post -c relations delete.xml
    post -c relations relations-nested.xml

    q.op=AND&q={!parent which=doc_type:tshirt}(color:blue size:XL)

#### Query Time Joins

    post -c relations delete.xml
    post -c relations relations-join.xml

    q.op=AND&q={!join from=parent_id to=id}(size:XL color:blue)

Can't do?

    q.op=AND&q={!join from=(parent_id AND other_id) to=id}(size:XL color:blue)

## Function Queries

* functions can be run inline using `_val_:"function(params)"`
* the query parser enables the same, but looks nicer: `{!func}function(parms)`
* functions are applied on top of the existing values calculated by the query parser
* dismax and edismax sum the results of boosting functions, and do not multiply them
* `ms` function calculates milliseconds between two dates
  * `ms(NOW,2018-09-01T00:00::00Z)`
* excluding dates, indexed or stored fields can be used in function queries and type,
  such as integer vs. string, doesn't matter

### Setup

    solr zk upconfig -z localhost:9983 -n functions -d solr/functions/conf
    solr create_collection -c functions -n functions
    cd solr
    ./index.sh functions

Note: upload_date field is a pdate type

### Exercises

1. q=*:*&fq={!frange l=500 u=1000}views
2. q={!func}max(likes,views)&sort desc
3. q={!func}max(likes,views)&fl=views,likes,score,max(likes,views)&sort desc
4. q=*:*&fl=views,likes,score,max(likes),max(views)
5.
6.

## Spellchecking

* configured as a searchComponent in solrconfig.xml
* Different types:
  * IndexBasedSpellChecker: default type
  * DirectSolrSpechecker: doesn't need index directory but is less efficient on larger data sets
  * FileBasedSpellChecker: uses a text file as the dictionary instead of the index
* requestHandler defines the endpoint that uses the searchComponent
* add `spellcheck=true` to the query
* spellcheck.collate=true will return a new query to use
* accuracy defined between 0 and 1
  * lower values give you more suggestions but with less accuracy
  * related to cosign similarity or levenstein value
  * 0.85 seems to be a pretty good value

### Setup

    solr zk upconfig -z localhost:9983 -n training -d solr/training/conf
    solr create_collection -c training -n training
    post -c training delete.xml
    cd solr
    ./index.sh

### Exercises

Use `http://localhost:8983/solr/training/spell?`

1. Done in training configuration
2.
3. q=solar&spellcheck=true
4. q=seerching lags&spellcheck=true&spellcheck.collate=true
5.

    solr zk upconfig -z localhost:9983 -n spell-no-index -d solr/spell-no-index/conf
    solr create_collection -c spell-no-index -n spell-no-index

    q=solar&spellcheck=true

6.

    solr zk upconfig -z localhost:9983 -n spell-file -d solr/spell-file/conf
    solr create_collection -c spell-file -n spell-file

## Suggesters

* lookup factories can use different dictionaries
* similar setup to spellcheck: searchComponent and requestHandler
* suggesters have to be re-built periodically
* suggesters can be combined in the requestHandeler to use multiple components
  such as an index suggester with a file-based suggester
* if query terms from users were written to a file, you could use users' previous
  queries to provide suggestions

### Exercises

Use `http://localhost:8983/solr/training/suggest?`

4. suggest.q=so

## API V2

* new api that will replace the current one in the future
* available since 6.5
* the current api will be deprecated in a major version before v2 is rolled out
* very likely not until version 9

## Configuring Solr Internals

* master/slave versus solr cloud
  * use m/s if you don't need NRT queries
  * tune slaves for faster throughput
* update process handlers can perform changes to the document when they are received for indexing
* slowQueryThresholdMilis = queries that run longer than the threshold (in ms) will be
  written to the log
* use the process collection for the exercises

## Tuning

### Memory

* Total Solr Heap Usage
  * Lucene segments memory
  * indexing buffer
  * field value cache
  * filter cache
  * query results cache
  * document cache
  * per segment filter cache
  * transient memory for querying

### General Points

* doc values can lower the CPU requirements for facets
* compressed ops = setting inside the JVM which uses 32 bit pointer instead of 64
* for VMs, it's best to try and have a dedicated disk
* latency is the enemy

### Auto-Commit Tuning

* hard commit every 60 seconds

### Caches

* filter cache keeps your fq params in a cache
* every auto softCommit discards all the caches

## Scaling and SolrCloud

* PULL replicas in Solr 7 will eventually replace master/slave setups

## End Notes

1. (DocValues)[https://lucene.apache.org/solr/guide/7_2/docvalues.html]
