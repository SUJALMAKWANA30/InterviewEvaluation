const locationTokens = {};

export const loadLocationTokens = () => {

  if (process.env.EXAM_CENTER_1_TOKEN) {
    locationTokens[process.env.EXAM_CENTER_1_TOKEN] = {
      lat: parseFloat(process.env.EXAM_CENTER_1_LAT),
      lon: parseFloat(process.env.EXAM_CENTER_1_LON),
      maxRadius: parseInt(process.env.EXAM_CENTER_1_RADIUS),
      name: process.env.EXAM_CENTER_1_NAME || "Exam Center 1",
    };
  }

  if (process.env.EXAM_CENTER_2_TOKEN) {
    locationTokens[process.env.EXAM_CENTER_2_TOKEN] = {
      lat: parseFloat(process.env.EXAM_CENTER_2_LAT),
      lon: parseFloat(process.env.EXAM_CENTER_2_LON),
      maxRadius: parseInt(process.env.EXAM_CENTER_2_RADIUS),
      name: process.env.EXAM_CENTER_2_NAME || "Exam Center 2",
    };
  }

  if (Object.keys(locationTokens).length === 0) {
    locationTokens["ExamCenter1"] = {
      lat: 22.31510639531124,
      lon: 73.14437401324615,
      maxRadius: 300,
      name: "Exam Center 1",
    };
  }

  // console.log("📍 Loaded Location Tokens:", locationTokens);
};

export const getLocationTokens = () => locationTokens;
