#net start mosquitto
#net stop mosquitto


#net start telegraf
#net stop telegraf



# -*- coding: utf-8 -*-
"""
Created on Wed Oct 15 20:17:55 2025

@author: anton
"""

import json
import random
import time
from datetime import datetime
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "sensores/demo"

client = mqtt.Client()
client.connect(BROKER, PORT, keepalive=60)
client.loop_start()

try:
    while True:
        payload = {
            "sensor": "DHT22",
            "temp": round(random.uniform(20.0, 30.0), 2),
            "hum": round(random.uniform(30.0, 60.0), 2),
            "ts": datetime.utcnow().isoformat() + "Z"
        }
        client.publish(TOPIC, json.dumps(payload), qos=0, retain=False)
        print("Publicado:", payload)
        time.sleep(2)
except KeyboardInterrupt:
    pass
finally:
    client.loop_stop()
    client.disconnect()
