# PC Share - Fast Transfer

A high-speed file transfer application for sharing files between your PC and other devices over the local network.

## Features

- **Blazing Fast**: High-speed transfers over local Wi-Fi/Ethernet.
- **Web-Based UI**: Modern, responsive interface built with React & Tailwind CSS.
- **QR Code Sharing**: Easily scan a QR code on your mobile device to start receiving files.
- **Local Network Discovery**: Uses mDNS for easy device discovery.
- **Dark Mode**: Sleek dark UI for comfortable night usage.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Backend**: Python (FastAPI/main.py), mDNS, WebSocket support.
- **Containerization**: Docker & Docker Compose support.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd "pc share"
   ```

2. **Setup Backend**:

   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

3. **Setup Frontend**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Running with Docker

You can run the entire stack using Docker Compose:

```bash
docker-compose up -d
```

## License

MIT
