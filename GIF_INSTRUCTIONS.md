# 🎬 Using Animated GIF Sprites for Pokemon

## Overview
The Pokemon Desktop Pet now **prioritizes GIF files** for animated sprites! This means your Pokemon can have smooth, animated movements instead of static images.

## How to Add Animated Sprites

### 1. **File Naming Convention**
Place your GIF files in the Pokemon's folder with one of these names (in priority order):
- `[pokemon-name].gif` (e.g., `pikachu.gif`)
- `sprite.gif`

### 2. **Folder Structure**
```
/app/pokedex/
├── pikachu/
│   ├── pikachu.gif      ← Animated sprite (PRIORITIZED!)
│   ├── pikachu.png      ← Static fallback
│   ├── stats.json
│   └── data.json
├── charmander/
│   ├── charmander.gif   ← Add your GIF here!
│   ├── stats.json
│   └── data.json
└── ...
```

### 3. **File Priority**
The system searches for images in this order:
1. **`.gif`** files (animated) ✅
2. `.png` files (static)
3. `.jpg` / `.jpeg` files (static)
4. `.webp` files (static)

**If a GIF exists, it will ALWAYS be used over static images!**

## Current Status
- ✅ **Bulbasaur** - Has animated GIF sprite
- ⚪ **Charmander** - Using static PNG (add `.gif` to animate)
- ⚪ **Squirtle** - Using static PNG (add `.gif` to animate)
- ⚪ **Pikachu** - Using static PNG (add `.gif` to animate)
- ⚪ **Dragonite** - Using static PNG (add `.gif` to animate)

## Enhanced Movement Animations

### New Animation Features:
1. **Smooth Acceleration/Deceleration** - Pokemon speed up and slow down naturally
2. **Better Jumping** - Enhanced jump arcs with squash & stretch effects
3. **Direction Transitions** - Smooth turning with rotation effects
4. **Walking Bob** - Dynamic bobbing based on movement speed
5. **Squash & Stretch** - Cartoon-style deformation on landing and jumping
6. **Tilt Animation** - Slight tilt while walking for more personality

## Technical Details

### GIF Support
- ✅ Fully supports animated GIF files
- ✅ GIFs loop automatically
- ✅ Works with canvas rendering
- ✅ No additional libraries needed

### Recommended GIF Settings
- **Size**: 80x80 pixels (or proportional)
- **Frame Rate**: 10-20 FPS for smooth animation
- **File Size**: Keep under 100KB for performance
- **Background**: Transparent PNG recommended

## Testing
Run this command to check which Pokemon have GIF sprites:
```bash
node test_gif_loading.js
```

## Adding More Pokemon
1. Create a new folder in `/app/pokedex/[pokemon-name]/`
2. Add your GIF file: `[pokemon-name].gif`
3. Add `stats.json` and `data.json`
4. Restart the application

The Pokemon will automatically appear with animated sprites! 🎉
