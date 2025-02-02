import json

def mirror_keep_z():
    # Load the original keep.json
    with open('assets/keep.json', 'r') as f:
        data = json.load(f)
    
    new_blocks = {}
    
    for coord, block_id in data['blocks'].items():
        x, y, z = map(int, coord.split(','))
        
        # Remove blocks with Z <= -10
        if z <= -10:
            continue
            
        # Keep original blocks between -9 and 9
        new_blocks[coord] = block_id
        
        # Mirror blocks with Z >= 10 to negative Z
        if z >= 10:
            # Flip X coordinate and mirror Z
            mirrored_coord = f"{-x},{y},{-z}"
            new_blocks[mirrored_coord] = block_id
    
    # Update the blocks data
    data['blocks'] = new_blocks
    
    # Save modified map
    with open('assets/keep-mirrored.json', 'w') as f:
        json.dump(data, f, indent=2)
        
    print("Successfully mirrored Z axis! Saved as keep-mirrored.json")

if __name__ == "__main__":
    mirror_keep_z()
