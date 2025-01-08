const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const uploadInput = document.getElementById("upload");
const processButton = document.getElementById("process-button");
const outputImage = document.getElementById("output");

let image = new Image();
let points = [];
let imagePath = "";

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
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    points = [];
    processButton.disabled = true;
};

canvas.addEventListener("click", (event) => {
    if (points.length >= 4) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    points.push([x, y]);

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();

    if (points.length > 1) {
        ctx.strokeStyle = "green";
        ctx.beginPath();
        ctx.moveTo(points[points.length - 2][0], points[points.length - 2][1]);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    if (points.length === 4) {
        ctx.beginPath();
        ctx.moveTo(points[3][0], points[3][1]);
        ctx.lineTo(points[0][0], points[0][1]);
        ctx.stroke();
        processButton.disabled = false;
    }
});

processButton.addEventListener("click", () => {
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