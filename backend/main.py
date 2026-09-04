from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory "database" list
devices_db = [
    {"id": 1, "name": "Rover Alpha", "status": "Online"},
    {"id": 2, "name": "Drone Bravo", "status": "Offline"}
]

class DeviceCreate(BaseModel):
    name: str
    status: str

# GET: Fetch all devices
@app.get("/api/devices")
def get_devices():
    return devices_db

# POST: Add a new device
@app.post("/api/devices")
def add_device(device: DeviceCreate):
    new_device = {
        "id": len(devices_db) + 1 if devices_db else 1,
        "name": device.name,
        "status": device.status
    }
    devices_db.append(new_device)
    return new_device

# DELETE: Remove a device by ID
@app.delete("/api/devices/{device_id}")
def delete_device(device_id: int):
    global devices_db
    devices_db = [d for d in devices_db if d["id"] != device_id]
    return {"status": "success"}