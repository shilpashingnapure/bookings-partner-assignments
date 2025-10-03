# Booking & Partner Verification System

## Project Overview

This project is a full-stack application to manage bookings and partner assignments. It includes features for reviewing  documents, confirming bookings, assigning the nearest available partner, and tracking partners' GPS locations in real-time. The system is designed to be concurrency-safe, ensuring that critical operations like partner assignment and document reviews are handled without conflicts.

## Tech Stack

* **Frontend**: Next.js,, TypeScript, Tailwind CSS
* **Backend**: Next.js API Routes
* **Database**: MongoDB
* **Caching & Messaging**: Redis (for locks, rate limiting, and pub/sub)
* **Containerization**: Docker Compose

## Running the Application Locally

To run this project, you will need **Docker** and **Docker Compose** installed on your machine.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/shilpashingnapure/bookings-partner-assignments.git
    cd bookings-partner-assignments
    ```

2.  **Create your environment file:**
    This project uses a `.env` file to manage the database credentials for Docker Compose. To get started, copy the example file:
    ```bash
    cp .env.example .env
    ```

3.  **Run the application:**
    Use Docker Compose to build the images and start all the services with a single command.
    ```bash
    docker-compose up --build
    ```
    The `--build` flag is only needed the first time you run it or after you make code changes. For subsequent starts, you can just use `docker-compose up`.

    The application will be available at `http://localhost:3000`.


## API Endpoints

### Bookings

* **`GET /api/bookings`**
    * Fetches all bookings and their current status (PENDING, CONFIRMED, or ASSIGNED).
* **`POST /api/bookings/{id}/review`**
    * Updates the status of a document (e.g., to "APPROVED").
    * **Body**: `{ "docType": "SELFIE", "status": "APPROVED" }`
* **`POST /api/bookings/{id}/confirm`**
    * Confirms a booking if all documents are approved.
    * Publishes a `booking:confirmed` event to Redis.
* **`POST /api/bookings/{id}/assign`**
    * Assigns the nearest online partner to a confirmed booking.
    * Publishes a `booking:assigned` event to Redis.
* **`GET /api/bookings/events`**
    * Streams real-time events (booking confirmations, partner assignments, and GPS updates) to the client using Server-Sent Events (SSE).

### Partners

* **`POST /api/partners/{id}/gps`**
    * Updates a partner's GPS location. This endpoint is rate-limited to 6 requests per minute per partner.
    * **Body**: `{ "lat": 19.203, "lng": 72.82}`
    * Publishes a `partner:location` event to Redis.
