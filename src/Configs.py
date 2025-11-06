import os
import re
from typing import Dict, Any


# ---------- helpers ----------
def _int(val, default: int = 0) -> int:
    try:
        return int(str(val).strip())
    except Exception:
        return default


def _str(val, default: str = "") -> str:
    s = (val or "").strip() if isinstance(val, str) else str(val or "")
    return s if s else default


class SimulationConfig:
    # Constants
    EXECUTION_MODE_LOCAL = 'local'
    EXECUTION_MODE_DOCKER = 'docker'
    EXECUTION_MODE_GNS3 = 'gns3'

    # configurable (allow override via env)
    EXECUTION_MODE = _str(os.getenv('EXECUTION_MODE'), EXECUTION_MODE_DOCKER).lower()
    if EXECUTION_MODE not in (EXECUTION_MODE_LOCAL, EXECUTION_MODE_DOCKER, EXECUTION_MODE_GNS3):
        EXECUTION_MODE = EXECUTION_MODE_DOCKER


class PHYSICS:
    AMBIENT_TEMP = 290.0
    HEAT_GAIN_K = 8.0e-3
    COOLING_K = 4.0e-3

    PRESSURE_K_TEMP   = 0.035
    PRESSURE_K_HEATER = 0.020
    PRESSURE_K_SPRAY  = 0.030
    PRESSURE_K_RELIEF = 0.080

    FLOW_INERTIA  = 0.003
    VALVE_INERTIA = 0.003
    FLUX_INERTIA  = 0.002

    RAD_BASELINE   = 0.02
    RAD_SPIKE_MAX  = 0.50
    RAD_SPIKE_PROB = 0.0005
    RAD_SPIKE_SEC  = (3, 12)

    SG_SEC_FEEDWATER_TEMP = 220.0
    SG_HX_K = 5.0e-3
    SG_LEVEL_INERTIA = 0.002
    SG_FEEDWATER_FLOW_MAX = 1.0
    SG_BOIL_OFF_K = 0.004
    SG_PRESSURE_K = 0.020
    SG_PRESSURE_RELIEF_K = 0.08


class TAG:
    # --- Sensor values (inputs) ---
    TAG_CORE_NEUTRON_FLUX_VALUE    = 'core_neutron_flux_value'
    TAG_CORE_TEMP_IN_VALUE         = 'core_temp_in_value'
    TAG_CORE_TEMP_OUT_VALUE        = 'core_temp_out_value'
    TAG_CORE_PRESSURE_VALUE        = 'core_pressure_value'
    TAG_CORE_FLOW_VALUE            = 'core_flow_value'
    TAG_SG_IN_PRESSURE_VALUE       = 'sg_in_pressure_value'
    TAG_PRIMARY_RAD_MON_VALUE      = 'primary_rad_mon_value'
    TAG_PRIMARY_LOOP_VALVE_POS_VALUE = 'primary_loop_valve_pos_value'

    # --- Actuator actuals / commands / modes (outputs) ---
    TAG_CORE_CONTROL_ROD_POS_VALUE = 'core_control_rod_pos_value'
    TAG_CORE_CONTROL_ROD_MODE      = 'core_control_rod_mode'
    TAG_CORE_NEUTRON_FLUX_SP       = 'core_neutron_flux_sp'
    TAG_CORE_RCP_SPEED_CMD         = 'core_rcp_speed_cmd'
    TAG_CORE_RCP_MODE              = 'core_rcp_mode'
    TAG_CORE_COOLANT_VALVE_CMD     = 'core_coolant_valve_cmd'
    TAG_CORE_COOLANT_VALVE_MODE    = 'core_coolant_valve_mode'
    TAG_PRIMARY_LOOP_VALVE_CMD     = 'primary_loop_valve_cmd'
    TAG_PRIMARY_LOOP_VALVE_MODE    = 'primary_loop_valve_mode'

    TAG_CORE_PRESSURIZER_HEATER_CMD = 'core_pressurizer_heater_cmd'
    TAG_CORE_PRESSURIZER_HEATER_MODE= 'core_pressurizer_heater_mode'
    TAG_CORE_PRESSURIZER_SPRAY_CMD  = 'core_pressurizer_spray_cmd'
    TAG_CORE_PRESSURIZER_SPRAY_MODE = 'core_pressurizer_spray_mode'
    TAG_CORE_PRESSURIZER_VALVE_CMD  = 'core_pressurizer_valve_cmd'
    TAG_CORE_PRESSURIZER_VALVE_MODE = 'core_pressurizer_valve_mode'
    TAG_CORE_RELIEF_VALVE_STATUS    = 'core_relief_valve_status'

    # --- Limits & alarms (outputs) ---
    TAG_CORE_TEMP_OUT_MAX          = 'core_temp_out_max'
    TAG_CORE_PRESSURE_MAX          = 'core_pressure_max'
    TAG_CORE_PRESSURE_HIHI         = 'core_pressure_hihi'
    TAG_CORE_FLOW_MIN              = 'core_flow_min'
    TAG_PRIMARY_RAD_ALARM_MAX      = 'primary_rad_alarm_max'
    TAG_CORE_ALARM_STATUS          = 'core_alarm_status'

    # ---------------- Secondary (SG) ----------------
    TAG_SG_SEC_TEMP_IN_VALUE       = 'sg_sec_temp_in_value'
    TAG_SG_SEC_TEMP_OUT_VALUE      = 'sg_sec_temp_out_value'
    TAG_SG_STEAM_PRESSURE_VALUE    = 'sg_steam_pressure_value'
    TAG_SG_LEVEL_VALUE             = 'sg_level_value'
    TAG_SG_FEEDWATER_FLOW_VALUE    = 'sg_feedwater_flow_value'
    TAG_SG_LEAK_MON_VALUE          = 'sg_leak_mon_value'
    TAG_SG_FEEDWATER_VALVE_CMD     = 'sg_feedwater_valve_cmd'
    TAG_SG_FEEDWATER_VALVE_MODE    = 'sg_feedwater_valve_mode'
    TAG_SG_RELIEF_VALVE_STATUS     = 'sg_relief_valve_status'
    TAG_SG_LEVEL_MIN               = 'sg_level_min'
    TAG_SG_LEVEL_MAX               = 'sg_level_max'
    TAG_SG_STEAM_P_MAX             = 'sg_steam_p_max'
    TAG_SG_STEAM_P_HIHI            = 'sg_steam_p_hihi'

    # NOTE: unchanged tag map (all on PLC1 for now)
    TAG_LIST = {
        TAG_CORE_NEUTRON_FLUX_VALUE:       {'id': 0,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 0.8},
        TAG_CORE_TEMP_IN_VALUE:            {'id': 1,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 290.0},
        TAG_CORE_TEMP_OUT_VALUE:           {'id': 2,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 300.0},
        TAG_CORE_PRESSURE_VALUE:           {'id': 3,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 15.0},
        TAG_CORE_FLOW_VALUE:               {'id': 4,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 0.6},
        TAG_SG_IN_PRESSURE_VALUE:          {'id': 5,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 14.9},
        TAG_PRIMARY_RAD_MON_VALUE:         {'id': 6,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 0.02},
        TAG_PRIMARY_LOOP_VALVE_POS_VALUE:  {'id': 7,  'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 0.5},

        TAG_CORE_CONTROL_ROD_POS_VALUE:    {'id': 8,  'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 50.0},
        TAG_CORE_CONTROL_ROD_MODE:         {'id': 9,  'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},
        TAG_CORE_NEUTRON_FLUX_SP:          {'id': 10, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.9},

        TAG_CORE_RCP_SPEED_CMD:            {'id': 11, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.6},
        TAG_CORE_RCP_MODE:                 {'id': 12, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},

        TAG_CORE_COOLANT_VALVE_CMD:        {'id': 13, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.5},
        TAG_CORE_COOLANT_VALVE_MODE:       {'id': 14, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},

        TAG_PRIMARY_LOOP_VALVE_CMD:        {'id': 15, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.5},
        TAG_PRIMARY_LOOP_VALVE_MODE:       {'id': 16, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},

        TAG_CORE_PRESSURIZER_HEATER_CMD:   {'id': 17, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.2},
        TAG_CORE_PRESSURIZER_HEATER_MODE:  {'id': 18, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},
        TAG_CORE_PRESSURIZER_SPRAY_CMD:    {'id': 19, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.0},
        TAG_CORE_PRESSURIZER_SPRAY_MODE:   {'id': 20, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},
        TAG_CORE_PRESSURIZER_VALVE_CMD:    {'id': 21, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.0},
        TAG_CORE_PRESSURIZER_VALVE_MODE:   {'id': 22, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},
        TAG_CORE_RELIEF_VALVE_STATUS:      {'id': 23, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0},

        TAG_CORE_TEMP_OUT_MAX:             {'id': 24, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 320.0},
        TAG_CORE_PRESSURE_MAX:             {'id': 25, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 15.5},
        TAG_CORE_PRESSURE_HIHI:            {'id': 26, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 15.9},
        TAG_CORE_FLOW_MIN:                 {'id': 27, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.5},
        TAG_PRIMARY_RAD_ALARM_MAX:         {'id': 28, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.20},
        TAG_CORE_ALARM_STATUS:             {'id': 29, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0},

        TAG_SG_SEC_TEMP_IN_VALUE:          {'id': 30, 'plc': 1, 'type': 'input',  'fault': 0.0, 'default': PHYSICS.SG_SEC_FEEDWATER_TEMP},
        TAG_SG_SEC_TEMP_OUT_VALUE:         {'id': 31, 'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 260.0},
        TAG_SG_STEAM_PRESSURE_VALUE:       {'id': 32, 'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 6.5},
        TAG_SG_LEVEL_VALUE:                {'id': 33, 'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 60.0},
        TAG_SG_FEEDWATER_FLOW_VALUE:       {'id': 34, 'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 0.6},
        TAG_SG_LEAK_MON_VALUE:             {'id': 35, 'plc': 1, 'type': 'input',  'fault': 0.0, 'default': 0.00},

        TAG_SG_FEEDWATER_VALVE_CMD:        {'id': 36, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0.6},
        TAG_SG_FEEDWATER_VALVE_MODE:       {'id': 37, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 3},
        TAG_SG_RELIEF_VALVE_STATUS:        {'id': 38, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 0},

        TAG_SG_LEVEL_MIN:                  {'id': 39, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 30.0},
        TAG_SG_LEVEL_MAX:                  {'id': 40, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 80.0},
        TAG_SG_STEAM_P_MAX:                {'id': 41, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 7.0},
        TAG_SG_STEAM_P_HIHI:               {'id': 42, 'plc': 1, 'type': 'output', 'fault': 0.0, 'default': 7.5},
    }


class Controllers:
    # Legacy static map for fallback / non-docker modes
    PLC_CONFIG: Dict[str, Dict[int, Dict[str, Any]]]={
        SimulationConfig.EXECUTION_MODE_DOCKER: {
            1: {'name': 'PLC1','ip': os.getenv('PLC1_HOST', 'plc1'), 'port': int(os.getenv('PLC1_PORT','502')), 'protocol':'ModbusWriteRequest-TCP'},
            2: {'name': 'PLC2','ip': os.getenv('PLC2_HOST', 'plc2'), 'port': int(os.getenv('PLC2_PORT','502')), 'protocol':'ModbusWriteRequest-TCP'},
        },
        SimulationConfig.EXECUTION_MODE_GNS3:  { 1:{'name':'PLC1','ip':'192.168.0.11','port':502,'protocol':'ModbusWriteRequest-TCP'},
                                                 2:{'name':'PLC2','ip':'192.168.0.12','port':502,'protocol':'ModbusWriteRequest-TCP'} },
        SimulationConfig.EXECUTION_MODE_LOCAL: { 1:{'name':'PLC1','ip':'127.0.0.1','port':5502,'protocol':'ModbusWriteRequest-TCP'},
                                                 2:{'name':'PLC2','ip':'127.0.0.1','port':5503,'protocol':'ModbusWriteRequest-TCP'} },
    }

    @staticmethod
    def _infer_count_from_env() -> int:
        c = _int(os.getenv("PLC_COUNT", ""), 0)
        if c > 0:
            return c
        max_idx = 0
        for k in os.environ.keys():
            m = re.match(r"^ICS_PLC(\d+)_IP$", k) or re.match(r"^PLC(\d+)_HOST$", k)
            if m:
                try:
                    max_idx = max(max_idx, int(m.group(1)))
                except Exception:
                    pass
        return max_idx or 0

    @staticmethod
    def build_plcs_from_env() -> Dict[int, Dict[str, Any]]:
        """
        Build {id: {'name','ip','port','protocol'}} from env.
        Prefers ICS_PLC{n}_IP; falls back to PLC{n}_HOST; if none, falls back to static map.
        """
        protocol = _str(os.getenv("PLC_PROTOCOL"), "ModbusWriteRequest-TCP")
        count = Controllers._infer_count_from_env()
        if not count:
            return {}

        out: Dict[int, Dict[str, Any]] = {}
        for n in range(1, count + 1):
            ip = _str(os.getenv(f"ICS_PLC{n}_IP"), _str(os.getenv(f"PLC{n}_HOST"), ""))
            if not ip:
                continue
            port = _int(os.getenv(f"PLC{n}_PORT", "502"), 502)
            out[n] = {"name": f"PLC{n}", "ip": ip, "port": port, "protocol": protocol}
        return out

    # Populated below after class creation
    PLCs: Dict[int, Dict[str, Any]] = {}


# finalize PLCs at import time
_dynamic = Controllers.build_plcs_from_env()
Controllers.PLCs = _dynamic if _dynamic else Controllers.PLC_CONFIG[SimulationConfig.EXECUTION_MODE]


class Connection:
    SQLITE_CONNECTION = {
        'type': 'sqlite',
        'path': os.getenv('SQLITE_PATH', 'storage/PhysicalSimulation1.sqlite'),
        'name': 'fp_table'
    }
    MEMCACHE_DOCKER_CONNECTION = {'type': 'memcache', 'path': '192.168.1.31:11211', 'name': 'fp_table'}
    MEMCACHE_LOCAL_CONNECTION  = {'type': 'memcache', 'path': '127.0.0.1:11211',   'name': 'fp_table'}
    File_CONNECTION            = {'type': 'file',     'path': 'storage/sensors_actuators.json', 'name': 'fake_name'}

    CONNECTION_CONFIG = {
        SimulationConfig.EXECUTION_MODE_GNS3:   SQLITE_CONNECTION,
        SimulationConfig.EXECUTION_MODE_DOCKER: SQLITE_CONNECTION,
        SimulationConfig.EXECUTION_MODE_LOCAL:  SQLITE_CONNECTION
    }
    CONNECTION = CONNECTION_CONFIG[SimulationConfig.EXECUTION_MODE]
