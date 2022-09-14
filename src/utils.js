import bearing from "@turf/bearing"
import { point } from "@turf/turf"

export const getPolygon = (polygon, reverse = false) => {
    let coordinates = JSON.parse(JSON.stringify(polygon))
    if (reverse) {
        coordinates = coordinates.map(c => c.reverse())
    }
    return coordinates
}

export const getDirectionByBearing = (bearing) => {
    if (!bearing) return null
    var direction
    switch (true) {
        case bearing >= 0 && bearing <= 90:
            direction = "NE"
            break;
        case bearing > 90 && bearing <= 180:
            direction = "SE"
            break;
        case bearing >= -180 && bearing <= -90:
            direction = "SW"
            break;
        case bearing > -90 && bearing < 0:
            direction = "NW"
            break;
        default:
            break;
    }
    return direction
}

const getDirectionByPoints = (direction1, direction2) => {
    var direction
    switch (true) {
        case ((direction1 === "NE" && direction2 === "NE") ||
            (direction1 === "NW" && direction2 === "NW") ||
            (direction1 === "NE" && direction2 === "NW") ||
            (direction1 === "NW" && direction2 === "NE")):
            direction = "NORTH"
            break;
        case ((direction1 === "NW" && direction2 === "SW") ||
            (direction1 === "SW" && direction2 === "NW")):
            direction = "WEST"
            break;
        case ((direction1 === "SE" && direction2 === "SE") ||
            (direction1 === "SW" && direction2 === "SW") ||
            (direction1 === "SW" && direction2 === "SE") ||
            (direction1 === "SE" && direction2 === "SW")):
            direction = "SOUTH"
            break;
        case ((direction1 === "SE" && direction2 === "NE") ||
            (direction1 === "NE" && direction2 === "SE")):
            direction = "EAST"
            break;
        default:
            break;
    }
    return direction
}

const isExistInArray = (arr, input) => !!arr.find(item => JSON.stringify(item) === JSON.stringify(input))

export const getDirection = (centroid) => (obj, thisCord, i, arr) => {
    const nextCord = arr[i + 1]
    const bearingCord = bearing(centroid, point(thisCord), { final: false })
    const bearingNextCord = (i + 1) < arr.length ? bearing(centroid, point(nextCord), { final: false }) : null

    const direction1 = getDirectionByBearing(bearingCord)
    const direction2 = getDirectionByBearing(bearingNextCord)

    const lineDirection = getDirectionByPoints(direction1, direction2)
    const newArray = obj[lineDirection] || []
    if (lineDirection) {
        if (!isExistInArray(newArray, thisCord)) newArray.push(thisCord)
        if (!isExistInArray(newArray, nextCord)) newArray.push(nextCord)
    }
    obj[lineDirection] = newArray
    return obj
}