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

    q=*:*&fq={!geofilt}&sfield=geo_location&pt=40.00,74.00&d=50&sort=geodist()%20asc

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

    <delete><query>*:*</query></delete>

    <add>
      <doc>
        <field name="id">1</field>
        <field name="title">T-Shirt One</field>
        <field name="doc_type">tshirt</field>
        <doc>
          <field name="id">2</field>
          <field name="color">blue</field>
          <field name="size">XL</field>
        </doc>
        <doc>
          <field name="id">3</field>
          <field name="color">red</field>
          <field name="size">XXL</field>
        </doc>
      </doc>
      <doc>
        <field name="id">4</field>
        <field name="title">T-Shirt Two</field>
        <field name="doc_type">tshirt</field>
        <doc>
          <field name="id">5</field>
          <field name="color">red</field>
          <field name="size">L</field>
        </doc>
        <doc>
          <field name="id">6</field>
          <field name="color">white</field>
          <field name="size">M</field>
        </doc>
      </doc>
    </add>

    q.op=AND&q={!parent which=doc_type:tshirt}(color:blue size:XL)


#### Query Time Joins

    <delete><query>*:*</query></delete>

    <add>
      <doc>
        <field name="id">1</field>
        <field name="title">T-Shirt One</field>
        <field name="doc_type">tshirt</field>
      </doc>
      <doc>
        <field name="id">2</field>
        <field name="color">blue</field>
        <field name="size">XL</field>
        <field name="parent_id">1</field>
      </doc>
      <doc>
        <field name="id">3</field>
        <field name="color">red</field>
        <field name="size">XXL</field>
        <field name="parent_id">1</field>
      </doc>
      <doc>
        <field name="id">4</field>
        <field name="title">T-Shirt Two</field>
        <field name="doc_type">tshirt</field>
      </doc>
      <doc>
        <field name="id">5</field>
        <field name="color">red</field>
        <field name="size">L</field>
        <field name="parent_id">4</field>
      </doc>
      <doc>
        <field name="id">6</field>
        <field name="color">white</field>
        <field name="size">M</field>
        <field name="parent_id">4</field>
      </doc>
    </add>

    q.op=AND&q={!join from=parent_id to=id}(size:XL color:blue)

## End Notes

1. (DocValues)[https://lucene.apache.org/solr/guide/7_2/docvalues.html]


