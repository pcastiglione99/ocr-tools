import cv2
import numpy as np
import pytesseract

def detect_corners(image) -> np.array:
# Resize the image for better processing (optional)
    scale_percent = 100  # Adjust the percentage for resizing
    width = int(image.shape[1] * scale_percent / 100)
    height = int(image.shape[0] * scale_percent / 100)
    image = cv2.resize(image, (width, height))


    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)


    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Sort contours by area in descending order
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    # Loop through contours to find the page contour
    for contour in contours:
        # Approximate the contour
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)

        # If the approximated contour has 4 points, we assume it's the page
        if len(approx) == 4:
            page_contour = approx
            break
    else:
        print("Could not detect page corners.")
        return np.array([[0,0],[width,0],[width, height],[0, height]], dtype=np.float32)

    # Refine corner detection using perspective transformation
    corner_points = page_contour[:, 0, :].astype(np.float32)

    # Draw the detected contour on the original resized image
    a = cv2.drawContours(image, [page_contour], -1, (0, 255, 0), 2)

    # Highlight the corners
    for point in page_contour:
        x, y = point[0]
        cv2.circle(image, (x, y), 5, (0, 0, 255), -1)

    # Calculate the center of the contour
    center_x, center_y = np.mean(corner_points, axis=0)

    # Sort points relative to their positions around the center
    ordered_corners = sorted(
        corner_points,
        key=lambda point: (np.arctan2(point[1] - center_y, point[0] - center_x))
    )

    # Assign corners in a consistent order: top-left, top-right, bottom-right, bottom-left
    ordered_corners = np.array(ordered_corners, dtype="float32")
    top_left = ordered_corners[0]
    top_right = ordered_corners[1]
    bottom_right = ordered_corners[2]
    bottom_left = ordered_corners[3]

    return np.array([top_left, top_right, bottom_right, bottom_left], dtype=np.float32)



def perspective_crop(image, points, output_path):
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
    cv2.imwrite(output_path, warped)



def ocr(image, output_path):
    ocr_image = pytesseract.image_to_pdf_or_hocr(image)
    with open(output_path, "wb") as f:
        f.write(ocr_image)
