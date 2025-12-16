# Signature System

This is a simple Node.js application that provides a web interface for users to sign a document and upload the signed image to the server. The server stores the uploaded signatures as PNG files.

## Features

-   **Signature Capture**: Uses `signature_pad` to capture user signatures.
-   **Document Generation**: Uses `html2canvas` to convert the HTML document into an image for upload.
-   **Secure Upload**: Server-side validation and sanitization of filenames to prevent directory traversal attacks.
-   **Static File Serving**: Serves the frontend application from the `public` directory.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

-   Node.js (LTS version recommended)
-   npm (Node Package Manager)

### Installation

1.  **Clone the repository (if applicable) or navigate to the project directory:**
    ```bash
    cd path/to/your/project
    ```

2.  **Install the server dependencies:**
    ```bash
    npm install
    ```

### Running the Application

1.  **Start the Node.js server:**
    ```bash
    npm start
    ```

2.  **Access the application:**
    Open your web browser and navigate to `http://localhost:3000`.

The server will automatically create an `uploads` directory in the project root if it doesn't already exist. Uploaded signature images will be stored in this directory.

## Project Structure

-   `server.js`: The main server-side application logic (Node.js with Express).
-   `public/`: Contains the frontend static files (HTML, CSS, JavaScript).
    -   `public/index.html`: The main web page for signature capture.
-   `uploads/`: Directory where the signed image files are stored by the server.
-   `package.json`: Defines project metadata and dependencies.
