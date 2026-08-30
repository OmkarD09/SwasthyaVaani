from typing import List, Dict, Any
from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections for real-time triage queue updates."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast an event payload to all connected clients."""
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WebSocket] Error broadcasting to client: {e}")
                self.disconnect(connection)


# Global singleton instance for app-wide event broadcasting
ws_manager = ConnectionManager()
