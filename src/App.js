import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Tooltip,
  useMap,
  Polyline,
} from "react-leaflet";

import {
  centroid,
  polygon as t_polygon,
  lineString,
  lineOffset,
  lineIntersect
} from "@turf/turf";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { polygonList, projections } from './data'
import proj4 from "proj4";
import { getDirection, getPolygon } from "./utils";

const units = { units: 'feet' };
const defaultIntersects = { intersects: null, center: [0, 0], xy: null }

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapCenter = ({ center }) => {
  const map = useMap()
  useEffect(() => {
    map?.setView?.(center, 14)
  }, [center, map])

  return null
}


function App() {
  const [inputs, setInputs] = useState({})
  const [intersects, setIntersects] = useState(defaultIntersects)
  const [latlng, setlatlng] = useState({ lat: "", lng: "" })

  const isValid = useMemo(() => {
    return !!(inputs?.polygon && inputs?.ns && inputs?.ew && inputs?.nsfeet && inputs?.ewfeet && inputs?._polygon?.length)
  }, [inputs])

  const onChangePolygon = ({ target: { value } }) => {
    var _polygon = value.replace(/ /g, '')
    try {
      _polygon = JSON.parse(_polygon)
      //Validate
      var isValidArray = Array.isArray(_polygon) && Array.isArray(_polygon[0])
      setInputs(v => ({ ...v, _polygon: isValidArray ? _polygon : null }))
      if (isValidArray) {
        //Update center
        const polygon = t_polygon([_polygon])
        const _centroid = centroid(polygon)
        setIntersects(v => ({ ...v, center: _centroid.geometry.coordinates.reverse() }))
      }
    } catch (error) {
      if (inputs?._polygon?.length) {
        setInputs(v => ({ ...v, _polygon: null }))
      }
    }
  }

  const onChange = ({ target: { name, value } }) => {
    const _polygon = name === 'polygon' ? polygonList[value] : null
    setInputs(val => {
      return {
        ...val,
        [name]: value,
        ...(_polygon && { _polygon }),
        ...((name === 'polygon' && value === "Other") && { _polygon: null }),
      }
    })
    //Update center
    if (_polygon) {
      const polygon = t_polygon([_polygon])
      const _centroid = centroid(polygon)
      setIntersects(v => ({ ...v, center: _centroid.geometry.coordinates.reverse() }))
    }
  }

  const onChangelatLng = ({ target: { name, value } }) => {
    setlatlng(val => {
      return {
        ...val,
        [name]: value
      }
    })
  }

  const handleCalculation = useCallback(() => {
    if (!isValid) return
    const coordinates = getPolygon(inputs._polygon)
    const polygon = t_polygon([coordinates])
    const _centroid = centroid(polygon)

    const { EAST, WEST, NORTH, SOUTH } = coordinates.reduce(getDirection(_centroid), {})

    var north = lineString(NORTH, { name: "north" })
    var west = lineString(WEST, { name: "west" })
    var south = lineString(SOUTH, { name: "south" })
    var east = lineString(EAST, { name: "east" })

    var eastWestLine = lineOffset(inputs?.ns === "S" ? south : north, -parseInt(inputs.nsfeet), units)
    var northSouthLine = lineOffset(inputs?.ew === "W" ? west : east, -parseInt(inputs.ewfeet), units)

    var intersects = lineIntersect(eastWestLine, northSouthLine);
    if (!intersects.features.length) {
      setIntersects(v => ({
        ...v,
        eastWestLine,
        northSouthLine,
        intersects: null,
        xy: null
      }))
      // alert("No Intersection")
      return
    }

    var xy
    if (inputs?.projection) {
      xy = proj4(projections[inputs?.projection].projection,
        intersects.features[0].geometry.coordinates)
    }

    setIntersects({
      xy,
      eastWestLine: eastWestLine.geometry.coordinates.slice(0).map(c => c.reverse()),
      northSouthLine: northSouthLine.geometry.coordinates.slice(0).map(c => c.reverse()),
      intersects: intersects.features[0].geometry.coordinates.reverse(),
      center: _centroid.geometry.coordinates.reverse()
    })
  }, [inputs, isValid])

  useEffect(() => {
    handleCalculation()
  }, [inputs, handleCalculation])

  const handleCalculationLatLng = () => {
    const xy = proj4(projections[latlng?.projection].projection,
      [parseFloat(latlng.lng), parseFloat(latlng.lat)])
    setlatlng(v => ({ ...v, xy }))
  }

  const renderPolygon = () => {
    const keys = Object.keys(polygonList)
    return keys.map(key => <option key={key} value={key}>{key}</option>)
  }

  const renderProjections = () => {
    const keys = Object.keys(projections)
    return keys.map(key => <option key={key} value={key}>{key}</option>)
  }

  const renderSidePanel = () => {
    return <div style={{
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
        <option value={"Other"}>Other</option>
      </select>
      {inputs?.polygon === "Other" && <textarea
        rows={10}
        onChange={onChangePolygon}
        name={"Other"}
        id={"Other"}
      />}
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
      <select
        onChange={onChange}
        name="projection"
        id="projection"
      >
        <option value={""}>Select Projection</option>
        {renderProjections()}
      </select>
      <button
        onClick={handleCalculation}
        style={{ padding: "4px" }}
        disabled={!isValid}
      >
        Calculate Intersection
      </button>

      <div>
        <div>
          Lat: <span>{intersects?.intersects?.[0]}</span>
        </div>
        <div>
          Lng: <span>{intersects?.intersects?.[1]}</span>
        </div>
        <div>
          X: <span>{parseInt(intersects?.xy?.[0] || 0)}</span>
        </div>
        <div>
          Y: <span>{parseInt(intersects?.xy?.[1] || 0)}</span>
        </div>
      </div>

      <details>
        <summary>
          Inputs
        </summary>
        {JSON.stringify(inputs, null, 2)}
      </details>
    </div>
  }

  const renderXYConvertor = () => {

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 10
      }}>
        <input
          onChange={onChangelatLng}
          name="lat"
          id="lat"
          placeholder="Enter Lat"
          type={"number"}
          step="any"
        />
        <input
          onChange={onChangelatLng}
          name="lng"
          id="lng"
          placeholder="Enter Lng"
          type={"number"}
          step="any"
        />
        <select
          onChange={onChangelatLng}
          name="projection"
          id="projection"
        >
          <option value={""}>Select Projection</option>
          {renderProjections()}
        </select>
        <button
          onClick={handleCalculationLatLng}
          style={{ padding: "4px" }}
          disabled={!isValid}
        >
          Calculate XY
        </button>
        <div>
          <div>
            X: <span>{parseInt(latlng?.xy?.[0] || 0)}</span>
          </div>
          <div>
            Y: <span>{parseInt(latlng?.xy?.[1] || 0)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="map" style={{ display: 'flex' }}>
      <div style={{
        width: "20vw",
        overflowY: "scroll",
        height: "100vh"
      }}>
        {renderSidePanel()}
        {renderXYConvertor()}
      </div>
      <MapContainer
        center={intersects.center}
        zoom={14}
        style={{ height: "100vh", width: "80vw" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />

        {inputs?._polygon?.length && <Polygon
          pathOptions={{ color: 'red' }}
          positions={getPolygon(inputs._polygon, true)}
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

        {intersects?.eastWestLine && <Polyline
          pathOptions={{ color: 'black' }}
          positions={intersects?.eastWestLine}>
        </Polyline>}

        {intersects?.northSouthLine && <Polyline
          pathOptions={{ color: 'blue' }}
          positions={intersects?.northSouthLine}>
        </Polyline>}

        <Circle
          pathOptions={{ color: "red" }}
          center={intersects.center}
        />

        <MapCenter center={intersects.center} />

      </MapContainer>
    </div>
  );
}

export default App;
