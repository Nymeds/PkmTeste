# 🎮 Quick Start Guide - Pokemon Desktop Pet

## Running the Application

### Start the Desktop Pet:
```bash
cd /app
npm start
```

### Development Mode (with debugging):
```bash
npm run dev
```

## 🎬 Using GIF Animations

### Current Status:
- ✅ **Bulbasaur** - Already has animated GIF sprite!
- ⚪ Other Pokemon - Using static PNG (waiting for your GIF files)

### To Add Your GIF Files:

1. **Place your GIF in the Pokemon folder:**
   ```
   /app/pokedex/pikachu/pikachu.gif
   /app/pokedex/charmander/charmander.gif
   /app/pokedex/squirtle/squirtle.gif
   /app/pokedex/dragonite/dragonite.gif
   ```

2. **Restart the application** - That's it! 🎉

### File Naming (Priority Order):
1. `[pokemon-name].gif` ← **HIGHEST PRIORITY** ✅
2. `sprite.gif`
3. `[pokemon-name].png`
4. `sprite.png`
5. `icon.png`

## 🎯 Animation Features

### What You'll See:
- **Smooth Walking**: Pokemon accelerate and decelerate naturally
- **Dynamic Jumping**: Better jump arcs with squash/stretch effects
- **Turn Animations**: Smooth rotation when changing direction
- **Walking Bob**: Bouncy movement synced to speed
- **Landing Impact**: Squash effect when landing from jumps

### Controls:
- **ESC** - Exit application
- **Click Wild Pokemon** - Start capture attempt
- **Hover Pokemon** - View stats card

## 🔍 Testing

### Check which Pokemon have GIF sprites:
```bash
node test_gif_loading.js
```

### Output Example:
```
bulbasaur       → .GIF   ✅ ANIMATED
charmander      → .PNG   ⚪ STATIC
pikachu         → .PNG   ⚪ STATIC
squirtle        → .PNG   ⚪ STATIC
dragonite       → .PNG   ⚪ STATIC
```

## 📁 Project Structure
```
/app/
├── src/
│   ├── main.js          # Electron main process (GIF priority implemented)
│   ├── pet.js           # Pet rendering & animations (enhanced)
│   ├── index.html       # Main window
│   ├── card.html        # Info card overlay
│   └── chooseStarter.html
├── pokedex/
│   ├── bulbasaur/
│   │   ├── bulbasaur.gif  ✅ Animated!
│   │   ├── stats.json
│   │   └── data.json
│   ├── pikachu/
│   │   ├── pikachu.png    ⚪ Add pikachu.gif here!
│   │   ├── stats.json
│   │   └── data.json
│   └── ...
└── prisma/
    └── schema.prisma    # Database schema
```

## 🎨 Recommended GIF Specs
- **Size**: 80x80 pixels (or similar aspect ratio)
- **FPS**: 10-20 frames per second
- **Format**: Transparent background (if possible)
- **File Size**: Under 100KB for best performance

## 🐛 Troubleshooting

### GIF not showing?
1. Check filename matches Pokemon name (e.g., `pikachu.gif`)
2. Ensure GIF is in correct folder: `/app/pokedex/[name]/`
3. Restart the application
4. Run `node test_gif_loading.js` to verify detection

### Pokemon not moving smoothly?
- This is expected with heavy GIF files
- Try optimizing your GIF file size
- Ensure GIF FPS is between 10-20

### Database issues?
```bash
cd /app
npx prisma generate
npx prisma migrate deploy
```

## 🚀 Features

### Working Features:
- ✅ Animated GIF sprite support
- ✅ Enhanced movement animations
- ✅ Wild Pokemon spawning system
- ✅ Capture system with rarity-based chances
- ✅ XP and leveling system
- ✅ Persistent Pokemon (saved to database)
- ✅ Info cards on hover
- ✅ Starter Pokemon selection

### Capture System:
- **Starter**: 45% capture rate
- **Common**: 60% capture rate
- **Uncommon**: 40% capture rate
- **Rare**: 25% capture rate
- **Legendary**: 10% capture rate

## 📝 Next Steps

1. ✅ Add your GIF files to Pokemon folders
2. ✅ Run the application: `npm start`
3. ✅ Watch your animated Pokemon walk around!
4. ✅ Capture wild Pokemon and level them up

---

**Need Help?** Check:
- `GIF_INSTRUCTIONS.md` - Detailed GIF usage guide
- `CHANGELOG.md` - Technical implementation details
