# Pokemon Desktop Pet - Changelog

## 🎬 GIF Animation Update

### New Features

#### 1. **GIF Sprite Priority**
- ✅ GIF files are now **prioritized** over static images (PNG, JPG, WEBP)
- ✅ Automatic detection and loading of animated sprites
- ✅ Backward compatible - falls back to static images if no GIF exists

#### 2. **Enhanced Movement Animations**
- ✅ **Smooth Acceleration/Deceleration**: Pokemon gradually speed up and slow down
- ✅ **Improved Jumping**: Better jump arcs with realistic physics
- ✅ **Squash & Stretch**: Cartoon-style deformation on landing and jumping
- ✅ **Dynamic Bobbing**: Walking bob animation synced with movement speed
- ✅ **Turn Transitions**: Smooth rotation when changing direction
- ✅ **Walking Tilt**: Subtle tilt animation while walking

### Technical Changes

#### Modified Files:
1. **`/app/src/main.js`**
   - Updated `readPokedex()` function to prioritize GIF files
   - Search order: `.gif` → `.png` → `.jpg` → `.jpeg` → `.webp`

2. **`/app/src/pet.js`**
   - Updated `loadPokedex()` function to prioritize GIF files
   - Enhanced `Pet` class constructor with new animation properties:
     - `currentSpeed`, `acceleration`, `deceleration`
     - `stretch`, `turnProgress`
     - Improved jump physics
   - Rewritten `update()` method for smooth acceleration/deceleration
   - Enhanced `draw()` method with better squash/stretch rendering

### Animation Properties

#### New Pet Properties:
```javascript
this.currentSpeed = 0;           // Current movement speed
this.acceleration = 0.08;        // Speed-up rate
this.deceleration = 0.12;        // Slow-down rate
this.stretch = 0;                // Vertical stretch for jumps
this.turnProgress = 0;           // Turn animation progress
this.gravity = 0.5;              // Enhanced gravity
this.jumpStrength = 4.5;         // Higher jumps
```

### How to Use

#### Adding Animated Sprites:
1. Place GIF file in Pokemon folder: `/app/pokedex/[name]/[name].gif`
2. GIF will automatically be used instead of PNG
3. No code changes needed!

#### Example:
```
/app/pokedex/pikachu/
├── pikachu.gif    ← Add this for animation!
├── pikachu.png    ← Fallback if no GIF
├── stats.json
└── data.json
```

### Current Implementation Status
- ✅ GIF loading priority implemented
- ✅ Enhanced movement animations active
- ✅ Tested with Bulbasaur GIF
- ✅ Backward compatible with PNG sprites

### Testing
Run: `node test_gif_loading.js` to see which Pokemon have GIF sprites.

---
**Date**: 2025
**Version**: 2.0 - Animated Sprites Edition
