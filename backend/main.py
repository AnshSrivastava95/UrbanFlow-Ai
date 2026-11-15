
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="UrbanFlow AI API",
    description="Urban mobility intelligence platform",
    version="1.0.0"
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_origin = os.getenv("FRONTEND_ORIGIN")

if frontend_origin:
    origins.extend(
        origin.strip()
        for origin in frontend_origin.split(",")
        if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "name": "UrbanFlow AI",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "UrbanFlow AI API"
    }

@app.get("/api/traffic/summary")
def traffic_summary():
    return {
        "city": "Bengaluru",
        "data_source": "demonstration",
        "is_demo": True,
        "traffic_intensity": 78.4,
        "behaviour_clusters": 4,
        "network_status": "Analysis",
        "hourly_activity": [
            {"time": "06:00", "value": 34},
            {"time": "07:00", "value": 48},
            {"time": "08:00", "value": 82},
            {"time": "09:00", "value": 65},
            {"time": "10:00", "value": 42},
            {"time": "11:00", "value": 37},
            {"time": "12:00", "value": 55},
            {"time": "13:00", "value": 47},
            {"time": "14:00", "value": 62},
            {"time": "15:00", "value": 53},
            {"time": "16:00", "value": 76},
            {"time": "17:00", "value": 94},
            {"time": "18:00", "value": 86},
            {"time": "19:00", "value": 68}
        ],
        "clusters": [
            {"name": "Peak-hour congestion", "percentage": 38, "color": "cluster-gold"},
            {"name": "Steady movement", "percentage": 27, "color": "cluster-blue"},
            {"name": "Stop-and-go traffic", "percentage": 21, "color": "cluster-orange"},
            {"name": "Low-density flow", "percentage": 14, "color": "cluster-green"}
        ]
    }
