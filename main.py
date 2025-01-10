from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import cv2
import numpy as np
import os
from pydantic import BaseModel
from utilities import detect_corners, perspective_crop

app = FastAPI()

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Monta i file statici
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
def detect_page_corners(imagePath: str = Form()):

    # Load the image
    image_path = imagePath.replace("/uploads/", "")
    full_path = os.path.join(UPLOAD_FOLDER, image_path)
    image = cv2.imread(full_path)

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

    image_path = imagePath.replace("/uploads/", "")
    full_path = os.path.join(UPLOAD_FOLDER, image_path)
    
    if not os.path.exists(full_path):
        return JSONResponse(content={"error": "Image not found"}, status_code=404)

    image = cv2.imread(full_path)
    points = np.array(points, dtype="float32")
    output_path = os.path.join(UPLOAD_FOLDER, "warped_image.jpg")

    perspective_crop(
        image=image,
        points=points,
        output_path=output_path)

    return {"outputPath": f"/uploads/warped_image.jpg"}