const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const uploadInput = document.getElementById("upload");
const processButton = document.getElementById("process-button");
const detectCornersButton = document.getElementById("detect-corners-button");
const outputImage = document.getElementById("output");

let image = new Image();
let hRatio = 0;
let vRatio = 0;
let ratio=0;
let centerShift_x = 0;
let centerShift_y = 0;
let points = [];
let draggingPointIndex = null;
let imagePath = "";

canvas.width=500;
canvas.height=300;


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
            imagePath = data.filepath;
            image.src = imagePath;
        });
});

image.onload = () => {
    canvas.hidden = false;

    hRatio = canvas.width / image.width;
    vRatio = canvas.height / image.height;
    ratio  = Math.min ( hRatio, vRatio );

    centerShift_x = ( canvas.width - image.width*ratio ) / 2;
    centerShift_y = ( canvas.height - image.height*ratio ) / 2;
    

    ctx.drawImage(image, 0,0, image.width, image.height, centerShift_x, centerShift_y,image.width*ratio, image.height*ratio);
    points = [];
    processButton.disabled = true;
    detectCornersButton.disabled = false;
};

canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if clicking near an existing point
    const pointIndex = points.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 10);

    if (pointIndex === -1) { // Add a new point if not near an existing one
        if (points.length >= 4) return;
        points.push([x, y]);
    } else {
        return; // Do nothing on click if near an existing point (use drag or delete instead)
    }

    redrawCanvas();
});

canvas.addEventListener("mousedown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if a point is being dragged
    draggingPointIndex = points.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 30);
});

canvas.addEventListener("mousemove", (event) => {
    if (draggingPointIndex === null) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update the position of the dragged point
    points[draggingPointIndex] = [x, y];
    redrawCanvas();
});

canvas.addEventListener("mouseup", () => {
    draggingPointIndex = null; // Stop dragging when mouse is released
});


function redrawCanvas() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0,0, image.width, image.height, centerShift_x, centerShift_y,image.width*ratio, image.height*ratio);


    // Redraw points and lines
    points.forEach(([x, y], i) => {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        if (i > 0) {
            ctx.strokeStyle = "green";
            ctx.beginPath();
            ctx.moveTo(points[i - 1][0], points[i - 1][1]);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    });

    // Connect the last point to the first if there are 4 points
    if (points.length === 4) {
        ctx.beginPath();
        ctx.moveTo(points[3][0], points[3][1]);
        ctx.lineTo(points[0][0], points[0][1]);
        ctx.stroke();

        // Fill the polygon
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        points.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fill();

        processButton.disabled = false;
    }
}

detectCornersButton.addEventListener("click", () => {
    const formData = new FormData();
    formData.append("imagePath", imagePath);

    fetch("/detect", {
        method: "POST",
        body: formData,
    })
    .then((response) => response.json())
    .then((data) => {
        points = data.corners;
        points = points.map(([x,y]) => [x*ratio+centerShift_x, y*ratio+centerShift_y]);
        redrawCanvas()
    })
    .catch((error) => console.error("Errore:", error));;
})

processButton.addEventListener("click", () => {
    points = points.map(([x,y]) => [(x - centerShift_x)/ratio, (y - centerShift_y)/ratio]);


    fetch("/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            points: points,
            imagePath: imagePath,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            outputImage.src = data.outputPath;
            outputImage.hidden = false;
        })
        .catch((error) => console.error("Errore:", error));;
});