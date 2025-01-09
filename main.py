from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import cv2
import numpy as np
import os
from pydantic import BaseModel

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


class ProcessRequest(BaseModel):
    points: List[List[float]]
    imagePath: str

# Endpoint per elaborare l'immagine
@app.post("/process")
async def process_image(request: ProcessRequest):
    
    #ratio = float(request.ratio)
    points = request.points
    imagePath = request.imagePath

    image_path = imagePath.replace("/uploads/", "")
    full_path = os.path.join(UPLOAD_FOLDER, image_path)
    
    if not os.path.exists(full_path):
        return JSONResponse(content={"error": "Image not found"}, status_code=404)

    image = cv2.imread(full_path)
    points = np.array(points, dtype="float32")

    # Calcola larghezza e altezza della nuova immagine
    width = max(abs(points[0][0] - points[1][0]), abs(points[2][0] - points[3][0]))
    height = max(abs(points[0][1] - points[3][1]), abs(points[1][1] - points[2][1]))
    destination_points = np.array([
        [0, 0],
        [width - 1, 0],
        [width - 1, height - 1],
        [0, height - 1]
    ], dtype="float32")

    # Trasformazione prospettica
    matrix = cv2.getPerspectiveTransform(points, destination_points)
    warped = cv2.warpPerspective(image, matrix, (int(width), int(height)))

    # Salva l'immagine trasformata
    output_path = os.path.join(UPLOAD_FOLDER, "warped_image.jpg")
    cv2.imwrite(output_path, warped)
    return {"outputPath": f"/uploads/warped_image.jpg"}