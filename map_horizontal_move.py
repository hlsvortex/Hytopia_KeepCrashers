import json

# Load the keep.json file
with open('assets/keep.json', 'r') as file:
    data = json.load(file)

# Process the blocks
new_blocks = {}
for position, block_id in data['blocks'].items():
    x, y, z = map(int, position.split(','))
    new_x = x + 1  # Subtract 17 from the x-coordinate
    new_position = f"{new_x},{y},{z}"
    new_blocks[new_position] = block_id

# Update the blocks in the data
data['blocks'] = new_blocks

# Save the modified file
with open('assets/keep_modified.json', 'w') as file:
    json.dump(data, file, indent=2)

print("Map moved successfully! Check keep_modified.json.")