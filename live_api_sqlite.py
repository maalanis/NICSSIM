import sys
import os
import sqlite3
from fastapi import FastAPI

# Add NICSSIM/src to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, "src")
sys.path.append(BASE_DIR)
sys.path.append(SRC_DIR)

from src.Configs import TAG, Connection

app = FastAPI()

# SQLite path
SQLITE_PATH = os.path.join(SRC_DIR, Connection.SQLITE_CONNECTION["path"])
TABLE_NAME = Connection.SQLITE_CONNECTION["name"]

def read_value_from_sqlite(tag: str):
    """
    Read the latest value for a tag from SQLite.
    """
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        cursor = conn.cursor()
        
        query = f"""
            SELECT value 
            FROM {TABLE_NAME} 
            WHERE tag = ? 
            ORDER BY timestamp DESC 
            LIMIT 1;
        """
        
        cursor.execute(query, (tag,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return row[0]
        return None

    except Exception as e:
        print("SQLite read error:", e)
        return None


@app.get("/api/live")
def get_live_data():
    """
    Returns real-time telemetry values directly from SQLite storage.
    """

    data = {
        "core_temp_out": read_value_from_sqlite(TAG.TAG_CORE_TEMP_OUT_VALUE),
        "core_temp_in": read_value_from_sqlite(TAG.TAG_CORE_TEMP_IN_VALUE),
        "core_pressure": read_value_from_sqlite(TAG.TAG_CORE_PRESSURE_VALUE),
        "core_flow": read_value_from_sqlite(TAG.TAG_CORE_FLOW_VALUE),

        "sg_sec_temp_in": read_value_from_sqlite(TAG.TAG_SG_SEC_TEMP_IN_VALUE),
        "sg_sec_temp_out": read_value_from_sqlite(TAG.TAG_SG_SEC_TEMP_OUT_VALUE),
        "sg_steam_pressure": read_value_from_sqlite(TAG.TAG_SG_STEAM_PRESSURE_VALUE),
        "sg_level": read_value_from_sqlite(TAG.TAG_SG_LEVEL_VALUE),
        "sg_feedwater_flow": read_value_from_sqlite(TAG.TAG_SG_FEEDWATER_FLOW_VALUE),

        "primary_radiation": read_value_from_sqlite(TAG.TAG_PRIMARY_RAD_MON_VALUE),
        "primary_valve_pos": read_value_from_sqlite(TAG.TAG_PRIMARY_LOOP_VALVE_POS_VALUE),

        "core_alarm": read_value_from_sqlite(TAG.TAG_CORE_ALARM_STATUS),
    }

    return data
