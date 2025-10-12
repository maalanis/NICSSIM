import logging
import random
from datetime import datetime, timedelta

from ics_sim.Device import HIL
from Configs import TAG, PHYSICS, Connection


class FactorySimulation(HIL):
    def __init__(self):
        super().__init__('Factory', Connection.CONNECTION, 100)  # 100 ms loop
        self.init()

    def _logic(self):
        dt = self._current_loop_time - self._last_loop_time  # ms
        if dt <= 0:
            dt = 1
        dt_s = dt / 1000.0

        # Read current state (sensors)
        flux     = self._get(TAG.TAG_CORE_NEUTRON_FLUX_VALUE)
        temp_in  = self._get(TAG.TAG_CORE_TEMP_IN_VALUE)
        temp_out = self._get(TAG.TAG_CORE_TEMP_OUT_VALUE)
        pressure = self._get(TAG.TAG_CORE_PRESSURE_VALUE)
        flow     = self._get(TAG.TAG_CORE_FLOW_VALUE)

        # Commands / setpoints (actuators are modeled with inertia here)
        rcp_cmd      = self._get(TAG.TAG_CORE_RCP_SPEED_CMD)             # 0..1
        cool_valve   = self._get(TAG.TAG_CORE_COOLANT_VALVE_CMD)         # 0..1
        loop_valve   = self._get(TAG.TAG_PRIMARY_LOOP_VALVE_CMD)         # 0..1
        rod_pos      = self._get(TAG.TAG_CORE_CONTROL_ROD_POS_VALUE)     # %
        flux_sp      = self._get(TAG.TAG_CORE_NEUTRON_FLUX_SP)           # a.u.

        # Pressurizer actions
        heater_cmd   = self._get(TAG.TAG_CORE_PRESSURIZER_HEATER_CMD)    # 0..1
        spray_cmd    = self._get(TAG.TAG_CORE_PRESSURIZER_SPRAY_CMD)     # 0..1
        relief_open  = 1.0 if self._get(TAG.TAG_CORE_RELIEF_VALVE_STATUS) else 0.0

        # --- Actuator dynamics (approach commands) ---
        flow += (rcp_cmd - flow) * (PHYSICS.FLOW_INERTIA * dt)                 # pump -> flow
        self._valve_eff = max(0.0, min(1.0, self._valve_eff + (cool_valve - self._valve_eff) * (PHYSICS.VALVE_INERTIA * dt)))
        self._loop_valve_eff = max(0.0, min(1.0, self._loop_valve_eff + (loop_valve - self._loop_valve_eff) * (PHYSICS.VALVE_INERTIA * dt)))

        # Provide a measured position for the loop valve
        self._set(TAG.TAG_PRIMARY_LOOP_VALVE_POS_VALUE, self._loop_valve_eff)

        # --- Reactivity / flux ---
        reactivity = max(0.05, 1.0 - (rod_pos / 120.0))  # 0% rods ≈ 1.0, 100% rods ≈ ~0.17
        flux_target = max(0.0, flux_sp * reactivity)
        flux += (flux_target - flux) * (PHYSICS.FLUX_INERTIA * dt)
        flux = max(0.0, flux + random.gauss(0, 0.002))

        # --- Thermal balance ---
        heat_gain = PHYSICS.HEAT_GAIN_K * flux * dt      # °C
        # effective heat removal scales with pump flow, both valves, and deltaT
        effective_cooling_valve = self._valve_eff * self._loop_valve_eff
        cool_loss = PHYSICS.COOLING_K * (flow * effective_cooling_valve) * max(0.0, (temp_out - PHYSICS.AMBIENT_TEMP)) * dt

        # Inlet tends to ambient slowly (toy loop)
        temp_in += (PHYSICS.AMBIENT_TEMP - temp_in) * 0.001 * dt
        temp_out = temp_out + heat_gain - cool_loss
        temp_out += random.gauss(0, 0.02)

        # --- Pressure model ---
        # Base: temperature contribution
        pressure_base = 14.7 + PHYSICS.PRESSURE_K_TEMP * max(0.0, (temp_out - PHYSICS.AMBIENT_TEMP))

        # Pressurizer controls add/subtract
        pressure += (PHYSICS.PRESSURE_K_HEATER * heater_cmd * dt_s)      # heaters increase pressure
        pressure -= (PHYSICS.PRESSURE_K_SPRAY  * spray_cmd * dt_s)       # spray reduces pressure
        pressure -= (PHYSICS.PRESSURE_K_RELIEF * relief_open * dt_s)     # relief reduces pressure when open

        # Relax toward base (prevents runaway)
        pressure = 0.98 * pressure + 0.02 * pressure_base
        pressure += random.gauss(0, 0.002)

        # SG inlet pressure: slightly below core pressure (minor drop)
        sg_pin = max(0.0, pressure - 0.05 + random.gauss(0, 0.001))

        # Radiation monitor along primary piping
        now = datetime.now()
        if (not self._rad_spike['active']) and random.random() < PHYSICS.RAD_SPIKE_PROB:
            self._rad_spike['active'] = True
            sec = random.uniform(*PHYSICS.RAD_SPIKE_SEC)
            self._rad_spike['until'] = now + timedelta(seconds=sec)
            self._rad_spike['level'] = random.uniform(PHYSICS.RAD_BASELINE*2, PHYSICS.RAD_SPIKE_MAX)

        if self._rad_spike['active'] and now >= self._rad_spike['until']:
            self._rad_spike['active'] = False

        rad = self._rad_spike['level'] if self._rad_spike['active'] else PHYSICS.RAD_BASELINE
        rad += random.gauss(0, 0.005)
        rad = max(0.0, rad)

        # Clamp a few things to keep them sane
        flow = min(max(flow, 0.0), 1.2)

        # --- Write back sensors ---
        self._set(TAG.TAG_CORE_NEUTRON_FLUX_VALUE, flux)
        self._set(TAG.TAG_CORE_TEMP_IN_VALUE,      temp_in)
        self._set(TAG.TAG_CORE_TEMP_OUT_VALUE,     temp_out)
        self._set(TAG.TAG_CORE_PRESSURE_VALUE,     pressure)
        self._set(TAG.TAG_CORE_FLOW_VALUE,         flow)
        self._set(TAG.TAG_SG_IN_PRESSURE_VALUE,    sg_pin)
        self._set(TAG.TAG_PRIMARY_RAD_MON_VALUE,   rad)

    def init(self):
        # Seed DB with defaults
        initial_list = [(tag, TAG.TAG_LIST[tag]['default']) for tag in TAG.TAG_LIST]
        self._connector.initialize(initial_list)

        # Internal inertias
        self._valve_eff = self._get(TAG.TAG_CORE_COOLANT_VALVE_CMD)
        self._loop_valve_eff = self._get(TAG.TAG_PRIMARY_LOOP_VALVE_CMD)

        # Radiation transient state
        self._rad_spike = {'active': False, 'until': datetime.now(), 'level': PHYSICS.RAD_BASELINE}

    @staticmethod
    def recreate_connection():
        return True


if __name__ == '__main__':
    factory = FactorySimulation()
    factory.start()
