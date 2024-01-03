# Chat Application Server

This Node.js server is designed for a simple chat application featuring user authentication using JWT and real-time messaging using WebSockets. The server is built with the Express framework, relies on MongoDB for data storage, and incorporates WebSocket technology for live communication.

## Prerequisites

Before deploying the server, ensure you have the following installed:

- Node.js and npm
- MongoDB
- jsonwebtoken
- websocket
- Additional dependencies listed in the package.json file.

## Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/TharunMs/Chat-Node-Express-MongoDb.git
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Create a `.env` file in the root directory with the following configuration:**

    ```env
    PORT=your_port_number
    mongo_URL=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    ```

    Replace `your_port_number`, `your_mongodb_connection_string`, and `your_jwt_secret` with your desired values.

4. **Start the server:**

    ```bash
    npm start
    ```

    The server will be running on the specified port.

## API Endpoints

- `GET /test`: Test endpoint to verify server functionality.
  
- `GET /messages/:userId`: Retrieve chat messages between the authenticated user and the specified userId.

- `GET /people`: Obtain a list of users. Authentication is required.

- `POST /logout`: Log out the user by clearing the token cookie.

- `GET /profile`: Fetch the user profile based on the provided token.

- `POST /login`: Log in with a username and password. Returns a JWT token.

- `POST /register`: Register a new user with a username and password. Returns a JWT token.

## WebSocket Communication

The server establishes a WebSocket connection to enable real-time communication between clients. The WebSocket server listens for incoming connections and handles messages, including text messages and file uploads.

WebSocket messages include sender, receiver, text content, and optional file information.

## File Uploads

The server supports file uploads in messages. When sending a message with a file, the file is saved in the static directory, and the filename is stored in the database. File upload functionality is implemented using base64 encoding.

## Notes

- Ensure to secure your server for production use, including using HTTPS for WebSocket connections.

- Error handling is minimal in this example and should be extended for a production environment.

- This server is a backend component for a chat application and should be used in conjunction with a suitable frontend.
