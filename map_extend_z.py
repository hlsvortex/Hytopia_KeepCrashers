import json

# Load the keep.json file
with open('assets/keep.json', 'r') as file:
    data = json.load(file)

# Process the blocks
new_blocks = {}
for position, block_id in data['blocks'].items():
    x, y, z = map(int, position.split(','))
    
    # Move positive Z by +15 and negative Z by -15
    if z >= 0:
        new_z = z + 15  # Move positive Z forward
    else:
        new_z = z - 15  # Move negative Z backward
    
    new_position = f"{x},{y},{new_z}"
    new_blocks[new_position] = block_id

# Update the blocks in the data
data['blocks'] = new_blocks

# Save the modified file
with open('assets/keep_modified.json', 'w') as file:
    json.dump(data, file, indent=2)

print("Map moved successfully! Check keep_modified.json.")