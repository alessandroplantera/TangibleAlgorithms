import asyncio
import serial
import serial.tools.list_ports
from supabase import create_client, Client
import serial.tools.list_ports

last_image_index = None  # Variable to track the last image index

# Configuration
url: str = "https://dbfrqzavcmyvlavddqny.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZnJxemF2Y215dmxhdmRkcW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3MjEwMTcsImV4cCI6MjAyNTI5NzAxN30._JaMrMxwnZMgkkwsRJn8syjdBHyasHWGCkp0WgQL-14"
supabase: Client = create_client(url, key)
table_name = "button"

# Serial connection setup
ser = None
is_connected = False


def list_serial_ports():
    ports = serial.tools.list_ports.comports()
    if not ports:
        print("No serial ports found.")
        return

    print("Connected serial ports:")
    for port in ports:
        print(f" - {port.device}: {port.description}")
        if port.manufacturer:
            print(f"   Manufacturer: {port.manufacturer}")
        if port.serial_number:
            print(f"   Serial Number: {port.serial_number}")
        print()


list_serial_ports()
# Connect to the serial port


async def connect_to_serial(port_name="/dev/cu.usbserial-14330", baud_rate=115200):
    global ser, is_connected
    try:
        ser = serial.Serial(port_name, baud_rate, timeout=0)
        is_connected = True
        print(f"Successfully connected to {port_name} at {baud_rate} baud.")
    except serial.SerialException as e:
        is_connected = False
        print(f"Error connecting to serial port: {e}")

# Poll Supabase for changes
# Modified poll_for_changes function


async def poll_for_changes():
    global is_connected, last_image_index
    while is_connected:
        # Run the blocking Supabase calls in a thread pool
        executor = asyncio.get_event_loop().run_in_executor
        response_image_index = await executor(None, lambda: supabase.table(table_name).select("state").eq('variable', 'image_index').execute())
        response_safe_or_not = await executor(None, lambda: supabase.table(table_name).select("state").eq('variable', 'safe_or_not').execute())
        response_current_state = await executor(None, lambda: supabase.table(table_name).select("state").eq('variable', 'current_state').execute())
        response_start_button = await executor(None, lambda: supabase.table(table_name).select("state").eq('variable', 'start').execute())

        # Extract the data from the responses
        state_image_index = response_image_index.data[0]['state'] if response_image_index.data else None
        val_safe_or_not = response_safe_or_not.data[0]['state'] if response_safe_or_not.data else None
        val_start_button = response_start_button.data[0]['state'] if response_start_button.data else None
        state_current_state = response_current_state.data[0]['state'] if response_current_state.data else None

        # Check if image index has changed and button is pressed
        if state_image_index != last_image_index and val_start_button != 0:
            last_image_index = state_image_index  # Update the last image index
            await check_and_act_on_state(val_safe_or_not, val_start_button)

        await asyncio.sleep(0.5)  # Poll every 0.5 seconds


async def check_and_act_on_state(state_safe_or_not, state_start_button):
    # Verifica se state è diverso da 0
    if state_start_button != 0:
        print('Start Button is pressed')
        commands = []
        if state_safe_or_not == 1:
            commands = [
                'G10P0L20X0Y0Z0\n',
                'M3S0\n',
                'G90X-65Y225\n',
                'G90X-65Y170\n',
                'G90X-65Y170\n',
                'G90X0Y150\n',
                'G90X30Y180\n',
                'G90X0Y100\n',
                'G90X40Y85\n',
                'G90X0Y0\n',
                'G90X-60Y90\n'
                'G4P0.7\n',
                'M3S1000\n',
                'G4P0.7\n',
                'M3S0\n',
                'G4P0.5\n',
                'G90X-60Y90\n',
                'G90X0Y0\n'
            ]
            print("The image is Safe")
        elif state_safe_or_not == 0:
            commands = [
                'G10P0L20X0Y0Z0\n',
                'M3S0\n',
                'G90X-65Y225\n',
                'G90X-65Y170\n',
                'G90X-65Y170\n',
                'G90X0Y150\n',
                'G90X30Y180\n',
                'G90X0Y100\n',
                'G90X40Y85\n',
                'G90X0Y0\n',
                'G90X60Y90\n',
                'G4P0.7\n',
                'M3S1000\n',
                'G4P0.7\n',
                'M3S0\n',
                'G4P0.5\n',
                'G90X60Y90\n',
                'G90X0Y0\n'
            ]
            print('State is not Safe')
        for command in commands:
            send_to_serial(command)
            await asyncio.sleep(1)  # Delay between commands for stability


# Send commands to the serial port
def send_to_serial(data):
    if is_connected and ser:
        ser.write(data.encode())
        print(f"Sent: {data}")
    else:
        print("Serial connection not established or closed.")
    pass

# Main async function to start the process


async def main():
    await connect_to_serial()
    if is_connected:
        await poll_for_changes()
    if ser:
        ser.close()

# Start the program
if __name__ == "__main__":
    asyncio.run(main())
