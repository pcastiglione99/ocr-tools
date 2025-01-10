const inputCanvas = document.getElementById("input-canvas");
const outputCanvas = document.getElementById("output-canvas");
const inputCtx = inputCanvas.getContext("2d");
const outputCtx = outputCanvas.getContext("2d");
const uploadInput = document.getElementById("upload");
const processButton = document.getElementById("process-button");
const detectCornersButton = document.getElementById("detect-corners-button");
const performOcrButton = document.getElementById("perform-ocr-button");
//const outputImage = document.getElementById("output");

let inputImage = new Image();
let outputImage = new Image();

let inputHratio = 0;
let inputVratio = 0;
let inputRatio = 0;
let inputCenterShift_x = 0;
let inputCenterShift_y = 0;
let points = [];
let draggingPointIndex = null;
let inputImagePath = "";
let outputImagePath = "";

let outputHratio = 0;
let outputVratio = 0;
let outputRatio = 0;
let outputCenterShift_x = 0;
let outputCenterShift_y = 0;

uploadInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  // Send a POST request in order to upload the image
  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      inputImagePath = data.filepath;
      inputImage.src = inputImagePath;
    });
});

inputImage.onload = () => {
  inputCanvas.hidden = false;
  
  outputCanvas.hidden = true;
  processButton.hidden = true;
  points = []
  performOcrButton.hidden = true;

  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);

  inputHratio = inputCanvas.width / inputImage.width;
  inputVratio = inputCanvas.height / inputImage.height;
  inputRatio = Math.min(inputHratio, inputVratio);

  inputCenterShift_x = (inputCanvas.width - inputImage.width * inputRatio) / 2;
  inputCenterShift_y = (inputCanvas.height - inputImage.height * inputRatio) / 2;

  inputCtx.drawImage(
    inputImage,
    0,
    0,
    inputImage.width,
    inputImage.height,
    inputCenterShift_x,
    inputCenterShift_y,
    inputImage.width * inputRatio,
    inputImage.height * inputRatio
  );
  points = [];

  detectCornersButton.hidden = false;
};

outputImage.onload = () => {
  outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  
  outputCanvas.hidden = false;

  outputHratio = outputCanvas.width / outputImage.width;
  outputVratio = outputCanvas.height / outputImage.height;
  outputRatio = Math.min(outputHratio, outputVratio);

  outputCenterShift_x = (outputCanvas.width - outputImage.width * outputRatio) / 2;
  outputCenterShift_y = (outputCanvas.height - outputImage.height * outputRatio) / 2;
  outputCtx.drawImage(
    outputImage,
    0,
    0,
    outputImage.width,
    outputImage.height,
    outputCenterShift_x,
    outputCenterShift_y,
    outputImage.width * outputRatio,
    outputImage.height * outputRatio
  );

  performOcrButton.hidden = false;

};

inputCanvas.addEventListener("click", (event) => {
  const rect = inputCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Check if clicking near an existing point
  const pointIndex = points.findIndex(
    ([px, py]) => Math.hypot(px - x, py - y) < 10
  );

  if (pointIndex === -1) {
    // Add a new point if not near an existing one
    if (points.length >= 4) return;
    points.push([x, y]);
  } else {
    return; // Do nothing on click if near an existing point (use drag instead)
  }

  redrawCanvas();
});

inputCanvas.addEventListener("mousedown", (event) => {
  const rect = inputCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Check if a point is being dragged
  draggingPointIndex = points.findIndex(
    ([px, py]) => Math.hypot(px - x, py - y) < 50
  );
});

inputCanvas.addEventListener("mousemove", (event) => {
  if (draggingPointIndex === null) return;

  const rect = inputCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Update the position of the dragged point
  points[draggingPointIndex] = [x, y];
  redrawCanvas();
});

inputCanvas.addEventListener("mouseup", () => {
  draggingPointIndex = null; // Stop dragging when mouse is released
});

function redrawCanvas() {
  // Clear the canvas
  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  inputCtx.drawImage(
    inputImage,
    0,
    0,
    inputImage.width,
    inputImage.height,
    inputCenterShift_x,
    inputCenterShift_y,
    inputImage.width * inputRatio,
    inputImage.height * inputRatio
  );

  // Redraw points and lines
  points.forEach(([x, y], i) => {
    inputCtx.fillStyle = "red";
    inputCtx.beginPath();
    inputCtx.arc(x, y, 5, 0, 2 * Math.PI);
    inputCtx.fill();

    if (i > 0) {
      inputCtx.strokeStyle = "green";
      inputCtx.beginPath();
      inputCtx.moveTo(points[i - 1][0], points[i - 1][1]);
      inputCtx.lineTo(x, y);
      inputCtx.stroke();
    }
  });

  // Connect the last point to the first if there are 4 points
  if (points.length === 4) {
    inputCtx.beginPath();
    inputCtx.moveTo(points[3][0], points[3][1]);
    inputCtx.lineTo(points[0][0], points[0][1]);
    inputCtx.stroke();

    // Fill the polygon
    inputCtx.beginPath();
    inputCtx.moveTo(points[0][0], points[0][1]);
    points.forEach(([x, y]) => inputCtx.lineTo(x, y));
    inputCtx.closePath();
    inputCtx.fillStyle = "rgba(0, 255, 0, 0.5)";
    inputCtx.fill();
    
    processButton.hidden = false;
  }
}

detectCornersButton.addEventListener("click", () => {
  const formData = new FormData();
  formData.append("imagePath", inputImagePath);

  fetch("/detect", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      points = data.corners;
      points = points.map(([x, y]) => [
        x * inputRatio + inputCenterShift_x,
        y * inputRatio + inputCenterShift_y,
      ]);
      redrawCanvas();
    })
    .catch((error) => console.error("Errore:", error));
});

processButton.addEventListener("click", () => {
  points = points.map(([x, y]) => [
    (x - inputCenterShift_x) / inputRatio,
    (y - inputCenterShift_y) / inputRatio,
  ]);

  fetch("/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      points: points,
      imagePath: inputImagePath,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      outputImagePath = data.outputPath;
      //outputImage.src = outputImagePath;
      outputImage.src = `${outputImagePath}?t=${new Date().getTime()}`;
      outputImage.hidden = false;

    })
    .catch((error) => console.error("Errore:", error));
});

performOcrButton.addEventListener("click", () => {

  const formData = new FormData();
  formData.append("imagePath", outputImagePath);
  
  fetch("/ocr", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      outputPdfPath = data.outputPath;
      console.log("ocr")
      window.open(outputPdfPath);
    })
    .catch((error) => console.error("Errore:", error));
})