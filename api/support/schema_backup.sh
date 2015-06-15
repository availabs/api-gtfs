#!/bin/bash

schemaFile=$1
suffix="_src"
database=$2



cat "$schemaFile" |
while read schema # for every line in the file
do
	schema_src=$schema$suffix
	echo "$schema_src"
	psql -U dvad -d gtfs -c "DROP SCHEMA \"$schema_src\" CASCADE"
	pg_dump -U dvad --schema=$schema $database | sed "s/$schema/$schema_src/g" | psql -U dvad -d $database
done





 

