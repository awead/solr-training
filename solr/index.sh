#!/bin/bash
collection="training"
directory="data"
if [ ! -z "$1" ]; then
  collection=$1
fi
if [ ! -z "$2" ]; then
  directory=$2
fi
echo "Indexing data to $collection"
for file in $directory/*.json; do
  echo $file
  curl "http://localhost:8983/solr/$collection/update?commit=true" -H 'Content-type:application/json' -d "[`cat $file`]"
  echo
done
