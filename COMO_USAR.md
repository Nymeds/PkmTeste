# 🎮 Como Usar o Desktop Pet - Pokémon

## 🚀 Início Rápido

### 1. Instalar Dependências
```bash
npm install
npx prisma generate
```

### 2. Iniciar o Aplicativo
```bash
npm start
```

### 3. Primeira Vez
- Na primeira execução, você escolherá seu Pokémon inicial
- O Pokémon ficará andando na barra inferior da tela
- Pokémon selvagens aparecerão aleatoriamente

## 🎬 GIFs Animados

### ✅ O Que Foi Corrigido

Anteriormente, os GIFs apareciam **estáticos/travados** (como PNG). Agora eles **animam perfeitamente**!

**Problema anterior:**
- ❌ GIFs mostravam apenas o primeiro frame
- ❌ Apareciam grandes demais (80x80)
- ❌ Não animavam

**Solução atual:**
- ✅ GIFs totalmente animados
- ✅ Tamanho otimizado (64x64)
- ✅ Performance melhorada

### 📋 Como Adicionar GIFs Animados

1. **Obtenha um GIF de sprite do Pokémon**
   - Recomendado: 64x64 pixels
   - Fundo transparente
   - Taxa de quadros: 10-20 FPS
   - Tamanho: < 100KB

2. **Coloque na pasta do Pokémon**
   ```
   /app/pokedex/[nome-pokemon]/[nome-pokemon].gif
   ```
   
   Exemplo:
   ```
   /app/pokedex/pikachu/pikachu.gif
   /app/pokedex/charmander/charmander.gif
   ```

3. **Reinicie o aplicativo**
   ```bash
   npm start
   ```

### 🧪 Testar Detecção de GIFs

Execute o script de teste:
```bash
node test_gif_loading.js
```

Saída exemplo:
```
🎬 Testando detecção de GIFs e sprites...

bulbasaur  → .GIF   ✅ ANIMADO    (20.4 KB ✓)
charmander → .PNG   ⚪ ESTÁTICO   (0.5 KB ✓)
pikachu    → .PNG   ⚪ ESTÁTICO   (0.5 KB ✓)
```

## 🎯 Funcionalidades

### Pokémon do Jogador (Persistentes)
- ✅ Ficam sempre na tela
- ✅ Ganham XP automaticamente (5 XP a cada 3 segundos)
- ✅ Sobem de nível
- ✅ Stats aumentam ao subir de nível

### Pokémon Selvagens
- 🎲 Aparecem aleatoriamente a cada 30 segundos
- 🎯 Clique para tentar capturar
- 🎰 Chance de captura baseada na raridade:
  - Starter: 45%
  - Comum: 60%
  - Incomum: 40%
  - Raro: 25%
  - Lendário: 10%

### Captura de Pokémon
1. **Clique** no Pokémon selvagem
2. Aguarde as **3 tremidas** da pokébola
3. ✅ **Capturado** ou ❌ **Escapou**
4. Se capturado, aparece no seu time após 4 segundos

### Controles
- **ESC**: Cancelar captura em andamento
- **ESC** (na tela principal): Fechar aplicativo

## 📁 Estrutura de Pastas

```
/app/
├── pokedex/
│   ├── bulbasaur/
│   │   ├── bulbasaur.gif    ✅ GIF animado
│   │   ├── bulbasaur.png    (fallback)
│   │   ├── stats.json
│   │   └── data.json
│   ├── charmander/
│   │   ├── charmander.png   ⚪ Apenas PNG
│   │   ├── stats.json
│   │   └── data.json
│   └── ...
├── src/
│   ├── main.js              (Electron main process)
│   ├── pet.js               (Lógica dos pets)
│   ├── index.html           (Janela principal)
│   ├── card.html            (Card de info)
│   └── chooseStarter.html   (Escolha do inicial)
└── prisma/
    ├── schema.prisma        (Schema do banco)
    └── dev.db               (Banco SQLite)
```

## 🎨 Personalizando

### Adicionar Novo Pokémon

1. Crie uma pasta em `/app/pokedex/`:
   ```
   /app/pokedex/meu-pokemon/
   ```

2. Adicione os arquivos:
   ```
   meu-pokemon/
   ├── meu-pokemon.gif    (ou .png)
   ├── stats.json
   └── data.json
   ```

3. **stats.json** (exemplo):
   ```json
   {
     "name": "Meu Pokémon",
     "type": "Fire",
     "baseStats": {
       "hp": 50,
       "attack": 60,
       "defense": 45,
       "speed": 70
     },
     "hpGrowth": 5,
     "attackGrowth": 3,
     "defenseGrowth": 3,
     "speedGrowth": 2,
     "xpPerLevel": 100
   }
   ```

4. **data.json** (exemplo):
   ```json
   {
     "rarity": "common",
     "description": "Um Pokémon incrível!"
   }
   ```

5. Reinicie o app!

## 🔧 Solução de Problemas

### GIFs não animam
- ✅ **Corrigido!** Certifique-se de que está usando a versão atualizada
- Verifique se o arquivo é realmente `.gif` e não `.png`
- Execute `node test_gif_loading.js` para verificar detecção

### Pokémon muito grande
- ✅ **Corrigido!** Agora usa 64x64 pixels
- Se ainda grande, edite `pet.js` linha ~116: `this.width = 64; this.height = 64;`

### Erro ao iniciar
```bash
# Reinstalar dependências
rm -rf node_modules
npm install
npx prisma generate
npm start
```

### Banco de dados corrompido
```bash
# Resetar banco
rm prisma/dev.db
npx prisma migrate dev
npm start
```

## 📊 Verificar Status

### Ver log do backend (se houver erro)
```bash
tail -f /var/log/supervisor/*.log
```

### Verificar processos
```bash
ps aux | grep electron
```

## 🎯 Dicas

1. **Performance**: Mantenha GIFs < 100KB
2. **Qualidade**: Use fundo transparente nos GIFs
3. **Animação**: 10-20 FPS é ideal para sprites
4. **Tamanho**: 64x64 pixels é o padrão otimizado

## 🐛 Problemas Conhecidos

- Nenhum no momento! ✨

## 📝 Notas Técnicas

### Como os GIFs funcionam agora:
- **GIFs**: Renderizados como elementos HTML `<img>` posicionados absolutamente
- **PNGs**: Renderizados no Canvas HTML5
- **Sincronização**: Posição e transformações sincronizadas entre ambos

### Tecnologias:
- **Electron**: Framework para desktop
- **Canvas API**: Renderização de sprites estáticos
- **HTML/CSS**: Renderização de GIFs animados
- **Prisma + SQLite**: Banco de dados
- **Node.js**: Runtime JavaScript

---

**Desenvolvido com ❤️ usando Electron**

Para mais informações técnicas, veja:
- `GIF_FIX_SUMMARY.md` - Detalhes da correção de GIFs
- `IMPLEMENTATION_SUMMARY.md` - Resumo da implementação original
- `GIF_INSTRUCTIONS.md` - Instruções sobre GIFs
