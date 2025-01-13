from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import cv2
import numpy as np
import os
from pydantic import BaseModel
from utilities import detect_corners, perspective_crop, ocr

app = FastAPI()

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

PROCESSED_FOLDER = "processed"
if not os.path.exists(PROCESSED_FOLDER):
    os.makedirs(PROCESSED_FOLDER)

# Monta i file statici
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/processed", StaticFiles(directory="processed"), name="processed")

# Endpoint per la pagina principale
@app.get("/", response_class=HTMLResponse)
async def index():

    with open("templates/index.html", "r") as f:
        return f.read()

# Endpoint per caricare un'immagine
@app.post("/upload")
async def upload_image(image: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_FOLDER, image.filename)

    with open(file_path, "wb") as f:
        f.write(await image.read())

    return {"filepath": f"/uploads/{image.filename}"}
    

@app.post("/detect")
def detect_page_corners(imagePath: str = Form(...)):

    # Load the image
    imagePath = imagePath[1:]
    image = cv2.imread(imagePath)

    # Detect corners
    corners = detect_corners(image)
    
    return {"corners": corners.tolist()}



class ProcessRequest(BaseModel):
    points: List[List[float]]
    imagePath: str

# Endpoint per elaborare l'immagine
@app.post("/process")
async def process_image(request: ProcessRequest):

    points = request.points
    imagePath = request.imagePath

    imagePath = imagePath[1:]
    if not os.path.exists(imagePath):
        return JSONResponse(content={"error": "Image not found"}, status_code=404)

    image = cv2.imread(imagePath)
    points = np.array(points, dtype="float32")
    file_name = imagePath.strip("/uploads")
    output_path = os.path.join(PROCESSED_FOLDER,file_name)

    perspective_crop(
        image=image,
        points=points,
        output_path=output_path)

    return {"outputPath": f"/processed/{file_name}"}


@app.post("/ocr")
async def perform_ocr(imagePath: str = Form(...)):
    
    # Load the image
    imagePath = imagePath[1:]
    image = cv2.imread(imagePath)
    output_path = os.path.join(UPLOAD_FOLDER, "ocr_image.pdf")

    ocr(image, output_path)
    return {"outputPath": f"/uploads/ocr_image.pdf"}

