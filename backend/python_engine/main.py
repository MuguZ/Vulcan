import sys
import json
from shapely.geometry import Point, Polygon

def filter_affected_entities(polygon_coords, target_points):
    """
    polygon_coords: [[lng, lat], [lng, lat], ...]
    target_points: [{"id": "...", "lat": 11.93, "lng": 79.83, "type": "..."}, ...]
    """
    hazard_poly = Polygon(polygon_coords)
    inside_targets = []

    for item in target_points:
        point_geom = Point(item["lng"], item["lat"])
        if hazard_poly.contains(point_geom):
            inside_targets.append(item)

    return inside_targets

if __name__ == "__main__":
    try:
        raw_data = sys.stdin.read()
        if not raw_data:
            print(json.dumps({"success": False, "data": []}))
            sys.exit(0)

        payload = json.loads(raw_data)
        hazard_polygon = payload.get("polygon", [])
        entities = payload.get("points", [])

        filtered_results = filter_affected_entities(hazard_polygon, entities)
        print(json.dumps({"success": True, "data": filtered_results}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)