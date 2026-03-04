const axios = require("axios");

const getRoadDistanceKm = async (lat1, lon1, lat2, lon2) => {
  try {

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${lon1},${lat1};${lon2},${lat2}?overview=false`;

    const response = await axios.get(url);

    const route = response.data.routes[0];

    const distanceKm = route.distance / 1000;
    const durationMin = route.duration / 60;

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Number(durationMin.toFixed(2))
    };

  } catch (error) {

    console.error("OSRM Error:", error.message);

    return {
      distanceKm: 0,
      durationMin: 0
    };
  }
};

module.exports = { getRoadDistanceKm };