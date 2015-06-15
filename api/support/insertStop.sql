DROP FUNCTION add_stop_to_stop_times(stop TEXT, sequence_id INTEGER, id TEXT, schema TEXT);
DROP FUNCTION add_stop_to_stop_times(stop_id TEXT, sequence_id INT, ids TEXT[], schema TEXT);
DROP FUNCTION del_stop_from_stop_times(sequence_id INTEGER, id TEXT, schema TEXT);
DROP FUNCTION del_stop_from_stop_times(sequence_id INT, ids TEXT[], schema TEXT);
DROP FUNCTION update_st_times(trip_id TEXT, time_deltas INT[], schema TEXT);
DROP FUNCTION update_st_times(trip_ids TEXT[], time_deltas INT[], schema TEXT);


CREATE OR REPLACE FUNCTION add_stop_to_stop_times(stop TEXT, sequence_id INTEGER, id TEXT, schema TEXT)
RETURNS void AS $$
	DECLARE 
		curs REFCURSOR; 
		rec RECORD;
	BEGIN
		OPEN curs FOR EXECUTE format('SELECT * FROM %I.stop_times
		 								WHERE trip_id=$1 AND stop_sequence >= $2 ORDER BY stop_sequence DESC;',schema)
									USING id, sequence_id;
		LOOP
			FETCH NEXT FROM curs INTO rec;
			EXIT WHEN rec IS NULL;
			EXECUTE format('UPDATE %I.stop_times SET stop_sequence=stop_sequence+1 WHERE trip_id=$1 AND stop_sequence=$2',schema)
							USING rec.trip_id,rec.stop_sequence;
			--UPDATE cdta_20130906_0131.stop_times SET stop_sequence = stop_sequence + 1 WHERE CURRENT OF curs;
		END LOOP;
		EXECUTE format('INSERT INTO %I.stop_times(trip_id,stop_sequence,stop_id) VALUES ($1, $2, $3);',schema)
						USING id, sequence_id, stop;
		--INSERT INTO cdta_20130906_0131.stop_times(trip_id,stop_sequence,stop_id) VALUES (id, sequence_id, stop);
	END;
	$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_stop_to_stop_times(stop_id TEXT, sequence_id INT, ids TEXT[], schema TEXT)
RETURNS void as $$
	DECLARE
		index INT;
	BEGIN
		FOR index IN 1..array_length(ids,1) LOOP
			PERFORM add_stop_to_stop_times(stop_id,sequence_id,ids[index],schema);
		END LOOP; 
	END;
	$$LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION del_stop_from_stop_times(sequence_id INTEGER, id TEXT, schema TEXT)
RETURNS void as $$
	DECLARE
		curs REFCURSOR; 
		rec RECORD;
	BEGIN
		EXECUTE format('DELETE FROM %I.stop_times WHERE stop_sequence=$1 AND trip_id=$2;',schema)
						USING sequence_id, id;
		OPEN curs FOR EXECUTE format('SELECT * FROM %I.stop_times WHERE trip_id=$1 and stop_sequence > $2;',schema)
								USING id, sequence_id;
		LOOP
			FETCH NEXT FROM curs INTO rec;
			EXIT WHEN rec IS NULL;
			EXECUTE format('UPDATE %I.stop_times SET stop_sequence=stop_sequence - 1 WHERE trip_id=$1 AND stop_sequence=$2;',schema)
							USING rec.trip_id, rec.stop_sequence;
			--UPDATE cdta_20130906_0131.stop_times SET stop_sequence=stop_sequence - 1 WHERE CURRENT OF curs;
		END LOOP;
	END;
	$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION del_stop_from_stop_times(sequence_id INT, ids TEXT[], schema TEXT)
RETURNS void as $$
	DECLARE
		index INT;
	BEGIN
		FOR index IN 1..array_length(ids,1) LOOP
			PERFORM del_stop_from_stop_times(sequence_id,ids[index],schema);
		END LOOP; 
	END;
	$$LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_st_times(id TEXT, time_deltas INT[], schema TEXT)
RETURNS void as $$
	DECLARE
		inx INT := 1;
		curs REFCURSOR;
		rec RECORD;
		upInterval INTERVAL;
		newArrTime TEXT;
		newDepTime TEXT;
	BEGIN
		OPEN curs FOR EXECUTE format('SELECT trip_id,stop_sequence,arrival_time,departure_time FROM %I.stop_times WHERE trip_id=$1 ORDER BY stop_sequence;',schema)
		USING id;
		LOOP
			FETCH NEXT FROM curs INTO rec;
			EXIT WHEN rec IS NULL;
			IF rec.stop_sequence > 1 THEN
				upInterval := (time_deltas[inx]::text||' seconds')::INTERVAL;
				newArrTime := to_char(newArrTime::INTERVAL + upInterval,'HH24:MI:SS');
				newDepTime := to_char(newDepTime::INTERVAL + upInterval,'HH24:MI:SS');
				--RAISE NOTICE 'index is %, ArrivalTime is now %, DepartureTime is now %, delta %', inx, newArrTime, newDepTime, upInterval;
				EXECUTE format('UPDATE %I.stop_times SET arrival_time=$1,
													departure_time=$2 
													WHERE trip_id=$3 AND stop_sequence=$4;',schema) 
													USING newArrTime,newDepTime,rec.trip_id,rec.stop_sequence;
				inx := inx + 1;
			ELSE
				newArrTime = rec.arrival_time;
				newDepTime = rec.departure_time;
				
			END IF;
		END LOOP;
		
	END;
	$$LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_st_times(ids text[], time_deltas INT[], schema TEXT)
RETURNS void as $$
	DECLARE
		id TEXT;
	BEGIN
		FOREACH id IN ARRAY ids LOOP
			PERFORM update_st_times(id,time_deltas,schema);
		END LOOP;
	END;
	$$LANGUAGE plpgsql;

--SELECT * FROM update_st_times(ARRAY['2304745-AUG13-Troy-Weekday-01'],ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,34],'cdta_20130906_0131')
--SELECT * FROM add_stops(text '00000',ARRAY[12],ARRAY['2328042-AUG13-Albany-Weekday-01']);
