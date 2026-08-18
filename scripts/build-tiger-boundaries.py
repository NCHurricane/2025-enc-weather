"""Build compact Leaflet boundary GeoJSON from Census cartographic shapefiles."""

from __future__ import annotations

import argparse
import json
import tempfile
import zipfile
from pathlib import Path

import shapefile
from shapely.geometry import mapping, shape


PROPERTY_FIELDS = {
    "states": ("STATEFP", "STUSPS", "NAME"),
    "counties": ("STATEFP", "COUNTYFP", "GEOID", "NAME"),
}


def rounded(value, digits: int):
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, (list, tuple)):
        return [rounded(item, digits) for item in value]
    if isinstance(value, dict):
        return {key: rounded(item, digits) for key, item in value.items()}
    return value


def build_geojson(
    archive: Path,
    destination: Path,
    kind: str,
    tolerance: float,
    coordinate_digits: int,
) -> None:
    with tempfile.TemporaryDirectory(prefix=f"nch-tiger-{kind}-") as temp_directory:
        with zipfile.ZipFile(archive) as source_zip:
            source_zip.extractall(temp_directory)

        shapefiles = list(Path(temp_directory).glob("*.shp"))
        if len(shapefiles) != 1:
            raise RuntimeError(f"Expected one shapefile in {archive}, found {len(shapefiles)}")

        with shapefile.Reader(shapefiles[0]) as reader:
            fields = [field[0] for field in reader.fields[1:]]
            missing = set(PROPERTY_FIELDS[kind]) - set(fields)
            if missing:
                raise RuntimeError(f"Missing expected {kind} fields: {sorted(missing)}")

            features = []
            for source_record in reader.iterShapeRecords():
                properties = source_record.record.as_dict()
                geometry = shape(source_record.shape.__geo_interface__)
                if tolerance:
                    geometry = geometry.simplify(tolerance, preserve_topology=True)

                features.append(
                    {
                        "type": "Feature",
                        "properties": {
                            field: properties[field] for field in PROPERTY_FIELDS[kind]
                        },
                        "geometry": rounded(mapping(geometry), coordinate_digits),
                    }
                )

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(features):,} {kind} to {destination} ({destination.stat().st_size:,} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state-zip", required=True, type=Path)
    parser.add_argument("--county-zip", required=True, type=Path)
    parser.add_argument("--output-directory", required=True, type=Path)
    parser.add_argument("--state-tolerance", type=float, default=0.01)
    parser.add_argument("--county-tolerance", type=float, default=0.002)
    parser.add_argument("--coordinate-digits", type=int, default=4)
    arguments = parser.parse_args()

    build_geojson(
        arguments.state_zip,
        arguments.output_directory / "us-states-2025-500k.geojson",
        "states",
        arguments.state_tolerance,
        arguments.coordinate_digits,
    )
    build_geojson(
        arguments.county_zip,
        arguments.output_directory / "us-counties-2025-500k.geojson",
        "counties",
        arguments.county_tolerance,
        arguments.coordinate_digits,
    )


if __name__ == "__main__":
    main()
