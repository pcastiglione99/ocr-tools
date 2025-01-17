const inputCanvas = document.getElementById("input-canvas");
const outputCanvas = document.getElementById("output-canvas");
const inputCtx = inputCanvas.getContext("2d");
const outputCtx = outputCanvas.getContext("2d");
const uploadInput = document.getElementById("upload");
const processButton = document.getElementById("process-button");
const detectCornersButton = document.getElementById("detect-corners-button");
const nextImageButton = document.getElementById("next-image-button");
const performOcrButton = document.getElementById("perform-ocr-button");
const openPDFButton = document.getElementById("open-ocr-pdf-button");
const loadingOverlay = document.getElementById("loading-overlay");

inputCtx.shadowOffsetX = 5;
inputCtx.shadowOffsetY = 5;
inputCtx.shadowColor = '#888888';
inputCtx.shadowBlur = 20;

outputCtx.shadowOffsetX = 5;
outputCtx.shadowOffsetY = 5;
outputCtx.shadowColor = '#888888';
outputCtx.shadowBlur = 20;

const inputImages = [];
let inputImagesIndex = -1;

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
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  // Send a POST request in order to upload the image
  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      // Clear the inputImages array and reset the index
      inputImages.length = 0; // Clear the array
      inputImagesIndex = 0;
      
      // Add new images to the inputImages array
      data.filepaths.forEach((filepath) => {
        const newImage = new Image();
        newImage.src = filepath;
        inputImages.push(newImage);
      });
      
      // Update the first image in the array
      if (inputImages.length > 0) {
        inputImagePath = inputImages[inputImagesIndex].src.replace(
          inputImages[inputImagesIndex].baseURI,
          ""
        );
        inputImage.src = inputImagePath;

        // Force the canvas to update if necessary
        redrawCanvas();
      }

    });
});

nextImageButton.addEventListener("click", (event) => {
  inputImagesIndex += 1;

  inputImagePath = inputImages[inputImagesIndex].src.replace(
    inputImages[inputImagesIndex].baseURI,
    ""
  );
  inputImage.src = inputImagePath;
});

inputImage.onload = () => {
  inputCanvas.hidden = false;

  outputCanvas.hidden = true;
  processButton.hidden = false;

  nextImageButton.hidden = true;
  points = [];
  performOcrButton.hidden = true;

  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);

  inputHratio = inputCanvas.width / inputImage.width;
  inputVratio = inputCanvas.height / inputImage.height;
  inputRatio = Math.min(inputHratio, inputVratio)  - 0.02;

  inputCenterShift_x = (inputCanvas.width - inputImage.width * inputRatio) / 2;
  inputCenterShift_y =
    (inputCanvas.height - inputImage.height * inputRatio) / 2;

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
  outputRatio = Math.min(outputHratio, outputVratio) - 0.02;

  outputCenterShift_x =
    (outputCanvas.width - outputImage.width * outputRatio) / 2;
  outputCenterShift_y =
    (outputCanvas.height - outputImage.height * outputRatio) / 2;
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
  
  if (inputImages.length > 1 && inputImagesIndex != inputImages.length - 1) {
    nextImageButton.hidden = false;
  }

  if (inputImagesIndex === inputImages.length - 1) {
    performOcrButton.hidden = false;
  }

  window.scrollTo({
    top: 900,
    behavior: "smooth",
  });
};

inputCanvas.addEventListener("touchstart", (event) => {
  const rect = inputCanvas.getBoundingClientRect();
  const touch = event.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  draggingPointIndex = points.findIndex(
    ([px, py]) => Math.hypot(px - x, py - y) < 50
  );
});

inputCanvas.addEventListener("touchmove", (event) => {
  if (draggingPointIndex === null) return;

  const rect = inputCanvas.getBoundingClientRect();
  const touch = event.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  points[draggingPointIndex] = [x, y];
  redrawCanvas();

  // Prevenire il comportamento predefinito del touch (es. scrolling)
  event.preventDefault();
});

inputCanvas.addEventListener("touchend", () => {
  draggingPointIndex = null;
});

inputCanvas.addEventListener("click", (event) => {
  const rect = inputCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Check if clicking near an existing point
  const pointIndex = points.findIndex(
    ([px, py]) => Math.hypot(px - x, py - y) < 50
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
  if (points.length === 0) {
    points_for_processing = [
      [0, 0],
      [inputImage.width, 0],
      [inputImage.width, inputImage.height],
      [0, inputImage.height],
    ];
  } else {
    points_for_processing = points.map(([x, y]) => [
      (x - inputCenterShift_x) / inputRatio,
      (y - inputCenterShift_y) / inputRatio,
    ]);
  }
  fetch("/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      points: points_for_processing,
      imagePath: inputImagePath,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      outputImagePath = data.outputPath;
      outputImage.src = `${outputImagePath}?t=${new Date().getTime()}`;
    })
    .catch((error) => console.error("Errore:", error));
});

performOcrButton.addEventListener("click", () => {
  const formData = new FormData();
  formData.append("imagesPath", "/processed");

  // Show the loading overlay
  loadingOverlay.style.display = "flex";

  fetch("/ocr", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      outputPdfPath = data.outputPath;

      // Hide the overlay after processing
      loadingOverlay.style.display = "none";

      openPDFButton.hidden = false;
    })
    .catch((error) => {
      console.error("Errore:", error);
      loadingOverlay.style.display = "none";
    });
});

openPDFButton.addEventListener("click", () => {
  window.open(outputPdfPath);
});
