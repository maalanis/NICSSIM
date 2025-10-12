import logging

from ics_sim.Device import PLC, SensorConnector, ActuatorConnector
from Configs import TAG, Controllers, Connection


class PLC1(PLC):
    HYST = 0.5     # temp/flow alarm clear margin (°C / a.u.)
    P_HYST = 0.05  # MPa hysteresis for pressure controls
    RAD_HYST = 0.02

    def __init__(self):
        sensor_connector = SensorConnector(Connection.CONNECTION)
        actuator_connector = ActuatorConnector(Connection.CONNECTION)
        super().__init__(1, sensor_connector, actuator_connector, TAG.TAG_LIST, Controllers.PLCs)

    def _logic(self):
        # --- Read sensors ---
        flux     = self._get(TAG.TAG_CORE_NEUTRON_FLUX_VALUE)
        t_in     = self._get(TAG.TAG_CORE_TEMP_IN_VALUE)
        t_out    = self._get(TAG.TAG_CORE_TEMP_OUT_VALUE)
        p_core   = self._get(TAG.TAG_CORE_PRESSURE_VALUE)
        p_sg_in  = self._get(TAG.TAG_SG_IN_PRESSURE_VALUE)
        flow     = self._get(TAG.TAG_CORE_FLOW_VALUE)
        rad      = self._get(TAG.TAG_PRIMARY_RAD_MON_VALUE)

        # --- Read SPs / limits ---
        flux_sp  = self._get(TAG.TAG_CORE_NEUTRON_FLUX_SP)
        tmax     = self._get(TAG.TAG_CORE_TEMP_OUT_MAX)
        pmax     = self._get(TAG.TAG_CORE_PRESSURE_MAX)
        phihi    = self._get(TAG.TAG_CORE_PRESSURE_HIHI)
        fmin     = self._get(TAG.TAG_CORE_FLOW_MIN)
        radmax   = self._get(TAG.TAG_PRIMARY_RAD_ALARM_MAX)

        # === Control rods (reactivity) ===
        if not self._check_manual_input(TAG.TAG_CORE_CONTROL_ROD_MODE, TAG.TAG_CORE_CONTROL_ROD_POS_VALUE):
            rod = self._get(TAG.TAG_CORE_CONTROL_ROD_POS_VALUE)
            err = flux - flux_sp
            rod += err * 4.0  # proportional tweak
            rod = min(max(rod, 0.0), 100.0)
            self._set(TAG.TAG_CORE_CONTROL_ROD_POS_VALUE, rod)

        # === Primary pump speed (flow) ===
        if not self._check_manual_input(TAG.TAG_CORE_RCP_MODE, TAG.TAG_CORE_RCP_SPEED_CMD):
            cmd = self._get(TAG.TAG_CORE_RCP_SPEED_CMD)
            if t_out > (tmax - 3.0) or flow < (fmin + 0.05):
                cmd += 0.02
            elif t_out < (tmax - 8.0) and flow > (fmin + 0.2):
                cmd -= 0.01
            self._set(TAG.TAG_CORE_RCP_SPEED_CMD, min(max(cmd, 0.0), 1.0))

        # === Heat removal valve ===
        if not self._check_manual_input(TAG.TAG_CORE_COOLANT_VALVE_MODE, TAG.TAG_CORE_COOLANT_VALVE_CMD):
            v = self._get(TAG.TAG_CORE_COOLANT_VALVE_CMD)
            if t_out > (tmax - 2.0):
                v += 0.02
            elif t_out < (tmax - 10.0):
                v -= 0.01
            self._set(TAG.TAG_CORE_COOLANT_VALVE_CMD, min(max(v, 0.0), 1.0))

        # === Primary loop flow-control valve (affects overall flow effectiveness) ===
        if not self._check_manual_input(TAG.TAG_PRIMARY_LOOP_VALVE_MODE, TAG.TAG_PRIMARY_LOOP_VALVE_CMD):
            lv = self._get(TAG.TAG_PRIMARY_LOOP_VALVE_CMD)
            # Favor more opening if flow is near minimum or outlet is hot
            if flow < (fmin + 0.05) or t_out > (tmax - 5.0):
                lv += 0.02
            elif flow > (fmin + 0.2) and t_out < (tmax - 12.0):
                lv -= 0.01
            self._set(TAG.TAG_PRIMARY_LOOP_VALVE_CMD, min(max(lv, 0.0), 1.0))

        # === Pressurizer: heater & spray ===
        if not self._check_manual_input(TAG.TAG_CORE_PRESSURIZER_HEATER_MODE, TAG.TAG_CORE_PRESSURIZER_HEATER_CMD):
            h = self._get(TAG.TAG_CORE_PRESSURIZER_HEATER_CMD)
            if p_core < (pmax - self.P_HYST):
                h += 0.03
            elif p_core > (pmax + 0.02):
                h -= 0.02
            self._set(TAG.TAG_CORE_PRESSURIZER_HEATER_CMD, min(max(h, 0.0), 1.0))

        if not self._check_manual_input(TAG.TAG_CORE_PRESSURIZER_SPRAY_MODE, TAG.TAG_CORE_PRESSURIZER_SPRAY_CMD):
            s = self._get(TAG.TAG_CORE_PRESSURIZER_SPRAY_CMD)
            if p_core > (pmax + 0.03):
                s += 0.03
            elif p_core < (pmax - self.P_HYST):
                s -= 0.02
            self._set(TAG.TAG_CORE_PRESSURIZER_SPRAY_CMD, min(max(s, 0.0), 1.0))

        # === Pressurizer relief (auto high-high) ===
        relief_open = self._get(TAG.TAG_CORE_RELIEF_VALVE_STATUS)
        if p_core > phihi:
            relief_open = 1
        elif p_core < (pmax - 0.05):
            relief_open = 0
        self._set(TAG.TAG_CORE_RELIEF_VALVE_STATUS, relief_open)

        # Track a (manual/auto) analog "relief/pressurizer valve" cmd too, but leave in AUTO logic above
        if not self._check_manual_input(TAG.TAG_CORE_PRESSURIZER_VALVE_MODE, TAG.TAG_CORE_PRESSURIZER_VALVE_CMD):
            pv = 1.0 if relief_open else 0.0
            self._set(TAG.TAG_CORE_PRESSURIZER_VALVE_CMD, pv)

        # === Alarm logic (latched) ===
        alarm = self._get(TAG.TAG_CORE_ALARM_STATUS)
        trip  = (t_out > tmax) or (p_core > pmax) or (flow < fmin) or (rad > radmax)
        if alarm:
            if (t_out < (tmax - self.HYST)) and (p_core < (pmax - self.P_HYST)) and (flow > (fmin + 0.02)) and (rad < (radmax - self.RAD_HYST)):
                self._set(TAG.TAG_CORE_ALARM_STATUS, 0)
        else:
            if trip:
                self._set(TAG.TAG_CORE_ALARM_STATUS, 1)

    def _post_logic_update(self):
        super()._post_logic_update()


if __name__ == '__main__':
    plc1 = PLC1()
    plc1.set_record_variables(True)
    plc1.start()
