#!/usr/bin/env python3
import json
import logging
import os
import threading
import time
import paho.mqtt.client as mqtt
from AttackerBase import AttackerBase
from MqttHelper import read_mqtt_params
import queue

from ics_sim.Device import Runnable

class AttackerRemote(AttackerBase):

    def __init__(self):
        AttackerBase.__init__(self, 'attacker_remote')

        # file that contains MQTT connection params (JSON)
        # Prefer environment variable MQTT_CONN_FILE, else search common locations.
        self.remote_connection_file = os.getenv('MQTT_CONN_FILE', '').strip()
        self.enabled = False
        self.applying_attack = False
        self.mqtt_thread = None

        self.attacksQueue = queue.Queue()
        # avoid deprecated CallbackAPIVersion usage
        self.client = mqtt.Client()

        # retry time when no connection file found (seconds)
        self._retry_interval = int(os.getenv("MQTT_CONN_RETRY_SECONDS", "5"))

    def _logic(self):
        # Called repeatedly by Runnable loop
        if not self.enabled:
            self.__try_enable()
        elif not self.attacksQueue.empty():
            self.process_messages(self.attacksQueue.get())
        else:
            time.sleep(2)

    def __try_enable(self):
        """
        Try to locate a MQTT connection file in these locations (in order):
          1) path from MQTT_CONN_FILE env var
          2) /src/{filename} if file exists
          3) /src/mqtt_samples/{filename}
          4) working dir (legacy) {filename}
        If not found, log and sleep a bit, then return (will retry later).
        """
        candidate_names = []
        # environment-provided path may be absolute or relative
        if self.remote_connection_file:
            candidate_names.append(self.remote_connection_file)

        # default filenames to consider
        default_name = "MQTTSampleConnection.txt"
        candidate_names += [
            f"/src/{default_name}",
            f"/src/mqtt_samples/{default_name}",
            os.path.join(os.getcwd(), default_name)
        ]

        found = None
        for path in candidate_names:
            if not path:
                continue
            if os.path.exists(path):
                found = path
                break

        if not found:
            # give a clear log message and return (will retry later)
            msg = (
                "MQTT connection file not found. Set environment variable MQTT_CONN_FILE "
                "or place MQTTSampleConnection.txt in /src or /src/mqtt_samples. "
                f"Checked: {candidate_names}"
            )
            self.report(Runnable._make_text(msg, Runnable.COLOR_YELLOW), level=logging.WARNING)
            time.sleep(self._retry_interval)
            return

        # set resolved path
        self.remote_connection_file = found

        try:
            connection_params = read_mqtt_params(self.remote_connection_file)
        except Exception as e:
            self.report(f"Failed to parse connection file {self.remote_connection_file}: {e}", logging.ERROR)
            time.sleep(self._retry_interval)
            return

        # validate minimal keys
        if not all(key in connection_params for key in ("type", "address", "port", "topic")):
            self.report(f'Connection file ({self.remote_connection_file}) missing required keys.', logging.ERROR)
            time.sleep(self._retry_interval)
            return

        # validate values
        for value in connection_params.values():
            if isinstance(value, str) and (value.startswith("<") or value.endswith(">")):
                self.report(f'Connection file ({self.remote_connection_file}) seems to contain placeholders.', logging.ERROR)
                time.sleep(self._retry_interval)
                return

        # report discovered params
        new_msg = "connection file found with following params:\n"
        for key, value in connection_params.items():
            new_msg += f'{key}: {value}\n'
        new_msg = Runnable._make_text(new_msg, Runnable.COLOR_YELLOW)
        self.report(new_msg)

        # start mqtt thread
        if not self.mqtt_thread or not self.mqtt_thread.is_alive():
            self.mqtt_thread = threading.Thread(target=self.setup_mqtt_client, daemon=True)
            self.mqtt_thread.start()
        self.enabled = True

    def setup_mqtt_client(self):
        try:
            connection_params = read_mqtt_params(self.remote_connection_file)
            # subscribe to all subtopics under the provided topic
            connection_params['topic'] = connection_params['topic'].rstrip('/') + '/#'

            # username / password optional
            if 'username' in connection_params and 'password' in connection_params:
                try:
                    self.client.username_pw_set(connection_params['username'], connection_params['password'])
                except Exception as e:
                    self.report(f"Failed to set MQTT username/password: {e}", logging.ERROR)

            # callbacks
            self.client.on_subscribe = self.on_subscribe
            self.client.on_message = self.on_message
            self.client.on_connect = self.on_connect
            self.client.on_disconnect = self.on_disconnect

            addr = connection_params['address']
            port = int(connection_params['port'])
            self.report(f"Connecting to MQTT broker at {addr}:{port}", logging.INFO)
            self.client.connect(addr, port)
            self.client.subscribe(connection_params['topic'], qos=1)
            # blocking loop, runs in background thread
            self.client.loop_forever()
        except Exception as e:
            self.report(f"MQTT client setup failed: {e}", logging.ERROR)
            # Allow reconnection attempts by disabling and letting _logic retry
            self.enabled = False

    def on_connect(self, client, userdata, flags, rc):
        self.report(f"MQTT connected (rc={rc})", level=logging.INFO)

    def on_disconnect(self, client, userdata, rc):
        self.report(f"MQTT disconnected (rc={rc})", level=logging.WARNING)
        # attempt reconnect by setting enabled False so __try_enable runs again
        self.enabled = False

    def on_subscribe(self, client, userdata, mid, granted_qos):
        self.report("Subscribed: " + str(mid) + " " + str(granted_qos), level=logging.INFO)

    def on_message(self, client, userdata, msg):
        self.report(msg.topic + " " + str(msg.qos) + " " + str(msg.payload), level=logging.INFO)
        if self.applying_attack:
            self.report(f'Discard applying attack ({str(msg.payload)}) since already applying an attack.')
        else:
            self.attacksQueue.put(msg)

    def process_messages(self, msg):
        self.applying_attack = True

        try:
            # msg may be a paho message object
            payload = msg.payload if hasattr(msg, 'payload') else msg
            msg_json = json.loads(payload.decode("utf-8"))
            self.report(f'Start processing incoming message: ({msg_json})', level=logging.INFO)
            attack = self.find_tag_in_msg(msg_json, 'attack')

            if attack == 'ip-scan':
                self._scan_scapy_attack()

            elif attack == 'ddos':
                timeout = self.find_tag_in_msg(msg_json, 'timeout')
                target = self.find_tag_in_msg(msg_json, 'target')
                target = self.find_device_address(target)
                self._ddos_attack(timeout=timeout, target=target, num_process=5)

            elif attack == 'port-scan':
                self._scan_nmap_attack()

            elif attack == 'mitm':
                mode = self.find_tag_in_msg(msg_json, 'mode')
                timeout = self.find_tag_in_msg(msg_json, 'timeout')
                target = '192.168.0.1/24'
                if mode.lower() == 'link':
                    target_1 = self.find_tag_in_msg(msg_json, 'target1')
                    target_2 = self.find_tag_in_msg(msg_json, 'target2')
                    target = self.find_device_address(target_1) + "," + self.find_device_address(target_2)
                self._mitm_scapy_attack(target=target, timeout=timeout)

            elif attack == 'replay':
                mode = self.find_tag_in_msg(msg_json, 'mode')
                timeout = self.find_tag_in_msg(msg_json, 'timeout')
                target = '192.168.0.1/24'
                replay = self.find_tag_in_msg(msg_json, 'replay')
                if mode.lower() == 'link':
                    target_1 = self.find_tag_in_msg(msg_json, 'target1')
                    target_2 = self.find_tag_in_msg(msg_json, 'target2')
                    target = self.find_device_address(target_1) + "," + self.find_device_address(target_2)
                self._replay_scapy_attack(target=target, timeout=timeout, replay_count=replay)

            else:
                raise Exception(f"attack type: ({attack}) is not recognized!")
        except Exception as e:
            self.report(str(e))

        self.applying_attack = False

    @staticmethod
    def find_tag_in_msg(msg, tag):
        if tag not in msg:
            raise Exception(f'Cannot find tag name: ({tag}) in message!')
        return msg[tag]

    @staticmethod
    def find_device_address(device_name):
        env = {
            'plc1': os.getenv('PLC1_HOST'),
            'plc2': os.getenv('PLC2_HOST'),
            'hmi1': os.getenv('HMI1_HOST'),
            'hmi2': os.getenv('HMI2_HOST'),
        }
        key = device_name.lower()
        if env.get(key):
            return env[key]
        # fallback to legacy constants (kept for backward compat)
        if key == 'plc1': return '192.168.0.11'
        if key == 'plc2': return '192.168.0.12'
        if key == 'hmi1': return '192.168.0.21'
        if key == 'hmi2': return '192.168.0.22'
        raise Exception(f'target:({device_name}) is not recognized!')

if __name__ == '__main__':
    attackerRemote = AttackerRemote()
    attackerRemote.start()
