DROP FUNCTION add_stop_to_stop_times(stop TEXT, sequence_id INTEGER, id TEXT, schema TEXT);
DROP FUNCTION add_stop_to_stop_times(stop_id TEXT, sequence_id INT, ids TEXT[], schema TEXT);
DROP FUNCTION del_stop_from_stop_times(sequence_id INTEGER, id TEXT, schema TEXT);
DROP FUNCTION del_stop_from_stop_times(sequence_id INT, ids TEXT[], schema TEXT);
DROP FUNCTION update_st_times(trip_id TEXT, time_deltas INT[], schema TEXT);
DROP FUNCTION update_st_times(trip_ids TEXT[], time_deltas INT[], schema TEXT);
DROP FUNCTION delete_and_update_shapes_with_trips(trip_ids TEXT[],lats REAL[],lons REAL[],geoms TEXT[],schema TEXT);
DROP FUNCTION update_route_geom()
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

CREATE OR REPLACE FUNCTION delete_and_update_shapes_with_trips(trip_ids TEXT[],lats REAL[],lons REAL[],geoms TEXT[],schema TEXT)
RETURNS void as $$
	DECLARE
		rec RECORD;
		len INT;
		ix INT := 1;
	BEGIN
		EXECUTE format('Select Distinct shape_id FROM %I.trips WHERE trip_id = ANY ($1)',schema)
				INTO rec
				USING trip_ids;
		EXECUTE format('DELETE FROM %I.shapes WHERE shape_id=$1',schema) USING rec.shape_id;
		len := array_length(geoms,1); --get the length of the geometry array
		WHILE ix <= len LOOP
			EXECUTE format('INSERT INTO %I.shapes(shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,geom) VALUES
							($1,$2,$3,$4,ST_SetSRID(ST_GeomFromGeoJSON($5),4326)) ',schema)
							USING rec.shape_id,lats[ix],lons[ix],ix,geoms[ix];
			ix := ix + 1;
		END LOOP;

	END;	
	$$ LANGUAGE plpgsql;

--SELECT delete_and_update_shapes_with_trips(Array['2329091-AUG13-Albany-Weekday-01'],Array[42.6493034,42.6501538,42.6501538,42.6512235,42.6512235,42.6521015,42.6522839,42.6524556,42.6525624,42.6525624,42.6526165,42.6534282,42.6534282,42.6548144,42.6548144,42.6549339,42.6560731,42.6560731,42.6579916,42.6580833,42.6580833,42.6579916,42.6593971,42.6594845,42.6594845,42.6593971,42.6605779,42.6605779,42.6617853,42.6617853,42.6631522,42.6636125,42.6636125,42.6642573,42.6645308,42.6645308,42.6654637,42.6654637,42.6655233,42.6664245,42.6664245,42.6666391,42.6670439,42.6670439,42.6670897,42.6675133,42.6675133,42.6676154,42.6686883,42.6686883,42.6689351,42.6697183,42.6701152,42.6689071,42.6689071,42.6672292,42.6669351,42.6669351,42.6668537,42.6662223,42.6662223,42.6661241,42.6652551,42.6649868,42.6649868,42.6644933,42.6644933,42.6646031,42.6646031,42.664665,42.6648045,42.6650083,42.6655018,42.6656939,42.6656939,42.6658452,42.663635,42.663629,42.663629,42.6635385,42.6615562,42.6615562,42.6614785,42.6619487,42.6619487,42.6620042,42.6627349,42.6627349,42.662766,42.6630449,42.6631629,42.6636887,42.6643753,42.6651371,42.6655126,42.6657271,42.6670253,42.6677549,42.6680338,42.668581,42.6687741,42.6689136,42.6689565,42.6689672,42.6689565,42.6689243,42.6688385,42.6686668,42.6684952,42.6686561,42.670995,42.6711452,42.6712635,42.6712635,42.6713169,42.6716173,42.6723028,42.6723028,42.6728511,42.6730209,42.6730209,42.6730549,42.6733339,42.6734948,42.6741385,42.674278,42.674278,42.6751149,42.6751149,42.675544,42.675544,42.6758552,42.6761556,42.6761556,42.676539],Array[-73.7691221,-73.768701,-73.768701,-73.76819,-73.76819,-73.7677646,-73.7677109,-73.7677002,-73.7679071,-73.7679071,-73.7680113,-73.7694649,-73.7694649,-73.7719007,-73.7719007,-73.7721097,-73.7740814,-73.7740814,-73.7773991,-73.7773002,-73.7773002,-73.7773991,-73.7798774,-73.7797862,-73.7797862,-73.7798774,-73.7819274,-73.7819274,-73.7840365,-73.7840365,-73.7864006,-73.7872192,-73.7872192,-73.7883639,-73.7888319,-73.7888319,-73.790438,-73.790438,-73.7905419,-73.7921298,-73.7921298,-73.792237,-73.7934818,-73.7934818,-73.7936211,-73.7950224,-73.7950224,-73.7953591,-73.7986743,-73.7986743,-73.7994254,-73.8019145,-73.8031054,-73.8043808,-73.8043808,-73.8061523,-73.8064717,-73.8064717,-73.80656,-73.8071451,-73.8071451,-73.807236,-73.8076007,-73.8078368,-73.8078368,-73.8084161,-73.8084161,-73.8087461,-73.8087461,-73.8089311,-73.8092637,-73.8096285,-73.8102508,-73.8104971,-73.8104971,-73.8106906,-73.813051,-73.8130571,-73.8130571,-73.8131475,-73.815264,-73.815264,-73.815347,-73.8161054,-73.8161054,-73.8161945,-73.8174729,-73.8174729,-73.8175249,-73.817997,-73.8178682,-73.8173211,-73.8165379,-73.8157761,-73.8154328,-73.8152719,-73.8135767,-73.8125682,-73.8122141,-73.8114631,-73.8111949,-73.810873,-73.8107121,-73.810519,-73.8103473,-73.8101649,-73.8099289,-73.8096392,-73.8093174,-73.809135,-73.8066351,-73.8064635,-73.8067817,-73.8067817,-73.8069248,-73.8079441,-73.8100742,-73.8100742,-73.811785,-73.8123577,-73.8123577,-73.8124716,-73.8133085,-73.8138664,-73.8158083,-73.8162482,-73.8162482,-73.8189304,-73.8189304,-73.8202715,-73.8202715,-73.8212585,-73.8222134,-73.8222134,-73.8233787],Array['{"type":"Point","coordinates":[-73.7691221,42.6493034]}','{"type":"Point","coordinates":[-73.768701,42.6501538]}','{"type":"Point","coordinates":[-73.768701,42.6501538]}','{"type":"Point","coordinates":[-73.76819,42.6512235]}','{"type":"Point","coordinates":[-73.76819,42.6512235]}','{"type":"Point","coordinates":[-73.7677646,42.6521015]}','{"type":"Point","coordinates":[-73.7677109,42.6522839]}','{"type":"Point","coordinates":[-73.7677002,42.6524556]}','{"type":"Point","coordinates":[-73.7679071,42.6525624]}','{"type":"Point","coordinates":[-73.7679071,42.6525624]}','{"type":"Point","coordinates":[-73.7680113,42.6526165]}','{"type":"Point","coordinates":[-73.7694649,42.6534282]}','{"type":"Point","coordinates":[-73.7694649,42.6534282]}','{"type":"Point","coordinates":[-73.7719007,42.6548144]}','{"type":"Point","coordinates":[-73.7719007,42.6548144]}','{"type":"Point","coordinates":[-73.7721097,42.6549339]}','{"type":"Point","coordinates":[-73.7740814,42.6560731]}','{"type":"Point","coordinates":[-73.7740814,42.6560731]}','{"type":"Point","coordinates":[-73.7773991,42.6579916]}','{"type":"Point","coordinates":[-73.7773002,42.6580833]}','{"type":"Point","coordinates":[-73.7773002,42.6580833]}','{"type":"Point","coordinates":[-73.7773991,42.6579916]}','{"type":"Point","coordinates":[-73.7798774,42.6593971]}','{"type":"Point","coordinates":[-73.7797862,42.6594845]}','{"type":"Point","coordinates":[-73.7797862,42.6594845]}','{"type":"Point","coordinates":[-73.7798774,42.6593971]}','{"type":"Point","coordinates":[-73.7819274,42.6605779]}','{"type":"Point","coordinates":[-73.7819274,42.6605779]}','{"type":"Point","coordinates":[-73.7840365,42.6617853]}','{"type":"Point","coordinates":[-73.7840365,42.6617853]}','{"type":"Point","coordinates":[-73.7864006,42.6631522]}','{"type":"Point","coordinates":[-73.7872192,42.6636125]}','{"type":"Point","coordinates":[-73.7872192,42.6636125]}','{"type":"Point","coordinates":[-73.7883639,42.6642573]}','{"type":"Point","coordinates":[-73.7888319,42.6645308]}','{"type":"Point","coordinates":[-73.7888319,42.6645308]}','{"type":"Point","coordinates":[-73.790438,42.6654637]}','{"type":"Point","coordinates":[-73.790438,42.6654637]}','{"type":"Point","coordinates":[-73.7905419,42.6655233]}','{"type":"Point","coordinates":[-73.7921298,42.6664245]}','{"type":"Point","coordinates":[-73.7921298,42.6664245]}','{"type":"Point","coordinates":[-73.792237,42.6666391]}','{"type":"Point","coordinates":[-73.7934818,42.6670439]}','{"type":"Point","coordinates":[-73.7934818,42.6670439]}','{"type":"Point","coordinates":[-73.7936211,42.6670897]}','{"type":"Point","coordinates":[-73.7950224,42.6675133]}','{"type":"Point","coordinates":[-73.7950224,42.6675133]}','{"type":"Point","coordinates":[-73.7953591,42.6676154]}','{"type":"Point","coordinates":[-73.7986743,42.6686883]}','{"type":"Point","coordinates":[-73.7986743,42.6686883]}','{"type":"Point","coordinates":[-73.7994254,42.6689351]}','{"type":"Point","coordinates":[-73.8019145,42.6697183]}','{"type":"Point","coordinates":[-73.8031054,42.6701152]}','{"type":"Point","coordinates":[-73.8043808,42.6689071]}','{"type":"Point","coordinates":[-73.8043808,42.6689071]}','{"type":"Point","coordinates":[-73.8061523,42.6672292]}','{"type":"Point","coordinates":[-73.8064717,42.6669351]}','{"type":"Point","coordinates":[-73.8064717,42.6669351]}','{"type":"Point","coordinates":[-73.80656,42.6668537]}','{"type":"Point","coordinates":[-73.8071451,42.6662223]}','{"type":"Point","coordinates":[-73.8071451,42.6662223]}','{"type":"Point","coordinates":[-73.807236,42.6661241]}','{"type":"Point","coordinates":[-73.8076007,42.6652551]}','{"type":"Point","coordinates":[-73.8078368,42.6649868]}','{"type":"Point","coordinates":[-73.8078368,42.6649868]}','{"type":"Point","coordinates":[-73.8084161,42.6644933]}','{"type":"Point","coordinates":[-73.8084161,42.6644933]}','{"type":"Point","coordinates":[-73.8087461,42.6646031]}','{"type":"Point","coordinates":[-73.8087461,42.6646031]}','{"type":"Point","coordinates":[-73.8089311,42.664665]}','{"type":"Point","coordinates":[-73.8092637,42.6648045]}','{"type":"Point","coordinates":[-73.8096285,42.6650083]}','{"type":"Point","coordinates":[-73.8102508,42.6655018]}','{"type":"Point","coordinates":[-73.8104971,42.6656939]}','{"type":"Point","coordinates":[-73.8104971,42.6656939]}','{"type":"Point","coordinates":[-73.8106906,42.6658452]}','{"type":"Point","coordinates":[-73.813051,42.663635]}','{"type":"Point","coordinates":[-73.8130571,42.663629]}','{"type":"Point","coordinates":[-73.8130571,42.663629]}','{"type":"Point","coordinates":[-73.8131475,42.6635385]}','{"type":"Point","coordinates":[-73.815264,42.6615562]}','{"type":"Point","coordinates":[-73.815264,42.6615562]}','{"type":"Point","coordinates":[-73.815347,42.6614785]}','{"type":"Point","coordinates":[-73.8161054,42.6619487]}','{"type":"Point","coordinates":[-73.8161054,42.6619487]}','{"type":"Point","coordinates":[-73.8161945,42.6620042]}','{"type":"Point","coordinates":[-73.8174729,42.6627349]}','{"type":"Point","coordinates":[-73.8174729,42.6627349]}','{"type":"Point","coordinates":[-73.8175249,42.662766]}','{"type":"Point","coordinates":[-73.817997,42.6630449]}','{"type":"Point","coordinates":[-73.8178682,42.6631629]}','{"type":"Point","coordinates":[-73.8173211,42.6636887]}','{"type":"Point","coordinates":[-73.8165379,42.6643753]}','{"type":"Point","coordinates":[-73.8157761,42.6651371]}','{"type":"Point","coordinates":[-73.8154328,42.6655126]}','{"type":"Point","coordinates":[-73.8152719,42.6657271]}','{"type":"Point","coordinates":[-73.8135767,42.6670253]}','{"type":"Point","coordinates":[-73.8125682,42.6677549]}','{"type":"Point","coordinates":[-73.8122141,42.6680338]}','{"type":"Point","coordinates":[-73.8114631,42.668581]}','{"type":"Point","coordinates":[-73.8111949,42.6687741]}','{"type":"Point","coordinates":[-73.810873,42.6689136]}','{"type":"Point","coordinates":[-73.8107121,42.6689565]}','{"type":"Point","coordinates":[-73.810519,42.6689672]}','{"type":"Point","coordinates":[-73.8103473,42.6689565]}','{"type":"Point","coordinates":[-73.8101649,42.6689243]}','{"type":"Point","coordinates":[-73.8099289,42.6688385]}','{"type":"Point","coordinates":[-73.8096392,42.6686668]}','{"type":"Point","coordinates":[-73.8093174,42.6684952]}','{"type":"Point","coordinates":[-73.809135,42.6686561]}','{"type":"Point","coordinates":[-73.8066351,42.670995]}','{"type":"Point","coordinates":[-73.8064635,42.6711452]}','{"type":"Point","coordinates":[-73.8067817,42.6712635]}','{"type":"Point","coordinates":[-73.8067817,42.6712635]}','{"type":"Point","coordinates":[-73.8069248,42.6713169]}','{"type":"Point","coordinates":[-73.8079441,42.6716173]}','{"type":"Point","coordinates":[-73.8100742,42.6723028]}','{"type":"Point","coordinates":[-73.8100742,42.6723028]}','{"type":"Point","coordinates":[-73.811785,42.6728511]}','{"type":"Point","coordinates":[-73.8123577,42.6730209]}','{"type":"Point","coordinates":[-73.8123577,42.6730209]}','{"type":"Point","coordinates":[-73.8124716,42.6730549]}','{"type":"Point","coordinates":[-73.8133085,42.6733339]}','{"type":"Point","coordinates":[-73.8138664,42.6734948]}','{"type":"Point","coordinates":[-73.8158083,42.6741385]}','{"type":"Point","coordinates":[-73.8162482,42.674278]}','{"type":"Point","coordinates":[-73.8162482,42.674278]}','{"type":"Point","coordinates":[-73.8189304,42.6751149]}','{"type":"Point","coordinates":[-73.8189304,42.6751149]}','{"type":"Point","coordinates":[-73.8202715,42.675544]}','{"type":"Point","coordinates":[-73.8202715,42.675544]}','{"type":"Point","coordinates":[-73.8212585,42.6758552]}','{"type":"Point","coordinates":[-73.8222134,42.6761556]}','{"type":"Point","coordinates":[-73.8222134,42.6761556]}','{"type":"Point","coordinates":[-73.8233787,42.676539]}'],'cdta_20130906_0131');
--SELECT * FROM update_st_times(ARRAY['2304745-AUG13-Troy-Weekday-01'],ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,34],'cdta_20130906_0131')
--SELECT * FROM add_stops(text '00000',ARRAY[12],ARRAY['2328042-AUG13-Albany-Weekday-01']);
