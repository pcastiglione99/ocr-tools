# ocr-tools

![ocr-tools](./ocr-tools.gif)

## Description

This project is a web service for processing images, detecting page corners, performing perspective transformations, and extracting text using OCR. The service allows users to upload images, detect corners of a page, perform perspective correction, and extract text from the image in a PDF format.

## Features
- **Page Corner Selection**: User can select the corners of a page by clicking on them.
- **Page Corner Detection**: Automatically detects the four corners of a page in an image, suitable for document scanning or image alignment.
- **Perspective Correction**: Applies a perspective transformation to "straighten" images based on detected corners.
- **OCR**: Extracts text from images using Tesseract OCR and generates a searchable PDF.

## Installation

1. Clone the repository:
  ```bash
  git clone https://github.com/pcastiglione99/ocr-tools
  ```

2. Install dependencies:
  ```bash
  cd ocr-tools
  pip install -r requirements.txt
  ```
3. Ensure you have Tesseract installed.
  - Check [here](https://tesseract-ocr.github.io/tessdoc/Installation.html)


4. Run the FastAPI application:
  ```bash
  uvicorn main:app --reload
  ```
## Usage

The service will be available at [http://localhost:8000](http://localhost:8000)

## 🐳 Run with Docker  

You can easily run this project using Docker.  

1. Pull the Docker Image  
```bash
docker pull pcastiglione99/ocr-tools
```
2. Run the App
```bash
docker run -d -p 8000:8000 pcastiglione99/ocr-tools
```

