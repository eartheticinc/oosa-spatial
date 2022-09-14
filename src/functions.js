import {
  clustersDbscan,
  point,
  centroid,
  polygon as t_polygon,
  point as t_point,
  addToMap,
  bearing,
  toMercator,
  pointToLineDistance,
  lineString,
} from "@turf/turf";

export const ll_to_xy = (lat, long) => {
  var pt = point([0, 0]);
  var line = lineString([
    [1, 1],
    [-1, 1],
  ]);

  var distance = pointToLineDistance(pt, line, { units: "miles" });
  //   console.log(distance);
  //   return [x, y];
};
