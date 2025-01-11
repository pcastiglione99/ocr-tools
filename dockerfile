# Use the official Python base image
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

RUN apt-get update && apt-get -y install tesseract-ocr && python -m venv .venv && .venv/bin/pip install --no-cache-dir -U pip setuptools

# Copy the requirements file to the working directory
COPY requirements.txt requirements.txt

# Install the Python dependencies
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt && find /app/.venv \( -type d -a -name test -o -name tests \) -o \( -type f -a -name '*.pyc' -o -name '*.pyo' \) -exec rm -rf '{}' \+

# Copy the application code to the working directory
COPY . .

# Expose the port on which the application will run
EXPOSE 8080

ENV PATH="/app/.venv/bin:$PATH"
# Run the FastAPI application using uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

