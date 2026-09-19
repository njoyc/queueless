from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, service_id: int, websocket: WebSocket):
        await websocket.accept()

        if service_id not in self.active_connections:
            self.active_connections[service_id] = []

        self.active_connections[service_id].append(websocket)

    def disconnect(self, service_id: int, websocket: WebSocket):
        if service_id in self.active_connections:
            if websocket in self.active_connections[service_id]:
                self.active_connections[service_id].remove(websocket)

            if not self.active_connections[service_id]:
                del self.active_connections[service_id]

    async def broadcast(self, service_id: int, message: dict):
        connections = self.active_connections.get(service_id, [])

        for websocket in connections.copy():
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(service_id, websocket)


manager = ConnectionManager()