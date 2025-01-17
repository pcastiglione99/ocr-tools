from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import cv2
import numpy as np
import os
from pydantic import BaseModel
from utilities import detect_corners, perspective_crop, ocr, clean_folder

app = FastAPI()

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

PROCESSED_FOLDER = "processed"
if not os.path.exists(PROCESSED_FOLDER):
    os.makedirs(PROCESSED_FOLDER)

# Static files mounting
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/processed", StaticFiles(directory="processed"), name="processed")


# Main page endpoint
@app.get("/", response_class=HTMLResponse)
async def index():

    with open("templates/index.html", "r") as f:
        return f.read()


# Upload image endpoint
@app.post("/upload")
async def upload_image(images: List[UploadFile] = File(...)):
    clean_folder(UPLOAD_FOLDER)
    clean_folder(PROCESSED_FOLDER)
    file_paths = []
    for image in images:
        file_path = os.path.join(UPLOAD_FOLDER, image.filename)
        with open(file_path, "wb") as f:
            f.write(await image.read())
        file_paths.append(f"/{file_path}")

    return {"filepaths": file_paths}

# Detect corners endpoint
@app.post("/detect")
def detect_page_corners(imagePath: str = Form(...)):
    # Load the image
    imagePath = imagePath
    image = cv2.imread(imagePath)

    # Detect corners
    corners = detect_corners(image)

    return {"corners": corners.tolist()}


class ProcessRequest(BaseModel):
    points: List[List[float]]
    imagePath: str


# Process image endpoint
@app.post("/process")
async def process_image(request: ProcessRequest):

    points = request.points
    imagePath = request.imagePath

    imagePath = imagePath
    if not os.path.exists(imagePath):
        return JSONResponse(content={"error": "Image not found"}, status_code=404)

    image = cv2.imread(imagePath)
    points = np.array(points, dtype="float32")
    file_name = imagePath.strip("uploads")
    output_path = f"{PROCESSED_FOLDER}/{file_name}"

    perspective_crop(image=image, points=points, output_path=output_path)

    return {"outputPath": f"/processed/{file_name}"}

# Perform OCR endpoint
@app.post("/ocr")
async def perform_ocr(imagesPath: str = Form(...)):
    # Load the image
    imagePath = imagesPath[1:]
    output_path = os.path.join(PROCESSED_FOLDER, "ocr_image.pdf")
    ocr(imagePath, output_path)
    return {"outputPath": f"/processed/ocr_image.pdf"}
