from mdns_gen import start_mdns, stop_mdns


class MDNSService:
    def __init__(self):
        self.mdns_data = None

    async def start(self, port: int):
        self.mdns_data = await start_mdns(port)

    async def stop(self):
        if self.mdns_data and self.mdns_data[0]:
            await stop_mdns(*self.mdns_data)
