import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Tooltip,
  useMap,
} from "react-leaflet";

import {
  centroid,
  polygon as t_polygon,
  point as t_point,
  bearing,
  lineString,
  lineOffset,
  lineIntersect
} from "@turf/turf";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { polygonList } from './data'

const units = { units: 'feet' };
const defaultIntersects = { intersects: null, center: [0, 0] }

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

const getStartPosiiton = (centroid, coordinates) => {

  var _bearing = bearing(centroid, t_point(coordinates[0]), { final: false });

  //N,W,S,E
  var directionElement = []
  switch (true) {
    case _bearing >= 0 && _bearing <= 90:
      directionElement = [[0, 1], [1, 2], [2, 3], [3, 4]]
      break;
    case _bearing >= -90 && _bearing < 0:
      directionElement = [[3, 4], [0, 1], [1, 2], [2, 3]]
      break;
    case _bearing >= -180 && _bearing < -90:
      directionElement = [[2, 3], [3, 4], [0, 1], [1, 2]]
      break;
    default:
      directionElement = [[1, 2], [2, 3], [3, 4], [0, 1]]
      break;
  }

  return directionElement
}

const MapCenter = ({ center }) => {
  const map = useMap()
  useEffect(() => {
    map?.setView?.(center, 14)
  }, [center, map])

  return null
}

const getPolyGon = (polygon, reverse = false) => {
  let coordinates = JSON.parse(JSON.stringify(polygon))
  if (reverse) {
    coordinates = coordinates.map(c => c.reverse())
  }
  return coordinates
}

function App() {
  const [inputs, setInputs] = useState({})
  const [intersects, setIntersects] = useState(defaultIntersects)

  const isValid = useMemo(() => {
    return !!(inputs?.polygon && inputs?.ns && inputs?.ew && inputs?.nsfeet && inputs?.ewfeet)
  }, [inputs])

  const onChange = ({ target: { name, value } }) => {
    setInputs(val => {
      return {
        ...val,
        [name]: value,
        ...(name === 'polygon' && { _polygon: polygonList[value] })
      }
    })
  }

  const handleCalculation = useCallback(() => {
    if (!isValid) return
    const coordinates = getPolyGon(inputs._polygon)
    const polygon = t_polygon([coordinates])
    const _centroid = centroid(polygon)

    const [n, w, s, e] = getStartPosiiton(_centroid, coordinates)

    var north = lineString([coordinates[n[0]], coordinates[n[1]]], { name: "north" })
    var west = lineString([coordinates[w[0]], coordinates[w[1]]], { name: "west" })
    var south = lineString([coordinates[s[0]], coordinates[s[1]]], { name: "south" })
    var east = lineString([coordinates[e[0]], coordinates[e[1]]], { name: "east" })

    var eastWestLine = lineOffset(inputs?.ns === "S" ? south : north, -parseInt(inputs.nsfeet), units)
    var northSouthLine = lineOffset(inputs?.ew === "W" ? west : east, -parseInt(inputs.ewfeet), units)

    var intersects = lineIntersect(eastWestLine, northSouthLine);
    if (!intersects.features.length) {
      setIntersects(v => ({ ...v, intersects: null }))
      return alert("No Intersect")
    }
    setIntersects({
      intersects: intersects.features[0].geometry.coordinates.reverse(),
      center: _centroid.geometry.coordinates.reverse()
    })
  }, [inputs, isValid])

  useEffect(() => {
    handleCalculation()
  }, [inputs, handleCalculation])

  const renderPolygon = () => {
    const keys = Object.keys(polygonList)
    return keys.map(key => <option key={key} value={key}>{key}</option>)
  }

  const renderSidePanel = () => {
    return <div style={{
      width: '20vw',
      display: 'flex',
      flexDirection: 'column',
      padding: 10
    }}>
      <select
        onChange={onChange}
        name="polygon"
        id="polygon"
      >
        <option value={""}>Select Polygon</option>
        {renderPolygon()}
      </select>
      <select
        onChange={onChange}
        name="ns"
        id="ns"
      >
        <option value={""}>Select N/S</option>
        <option value="N">N</option>
        <option value="S">S</option>
      </select>
      <input
        onChange={onChange}
        name="nsfeet"
        id="nsfeet"
        placeholder="Enter NS feet"
        type={"number"}
      />
      <select
        onChange={onChange}
        name="ew"
        id="ew"
      >
        <option value={""}>Select E/W</option>
        <option value="E">E</option>
        <option value="W">W</option>
      </select>
      <input
        onChange={onChange}
        name="ewfeet"
        id="ewfeet"
        placeholder="Enter EW feet"
        type={"number"}
      />
      <button
        onClick={handleCalculation}
        style={{ padding: "4px" }}
        disabled={!isValid}
      >
        Calculate
      </button>
      <div>
        {JSON.stringify(inputs, null, 2)}
      </div>
    </div>
  }

  return (
    <div id="map" style={{ display: 'flex' }}>
      {renderSidePanel()}
      <MapContainer
        center={intersects.center}
        zoom={14}
        style={{ height: "100vh", width: "80vw" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />

        {inputs?._polygon && <Polygon
          pathOptions={{ color: 'red' }}
          positions={getPolyGon(inputs._polygon, true)}
        >
        </Polygon>}

        {intersects?.intersects && <Circle
          center={intersects.intersects}
          pathOptions={{ fillColor: "blue" }}
          radius={2}
        >
          <Tooltip permanent>
            {"Intersection - "}
            {JSON.stringify(intersects.intersects)}
          </Tooltip>
        </Circle>}
        <MapCenter center={intersects.center} />
      </MapContainer>
    </div>
  );
}

export default App;
