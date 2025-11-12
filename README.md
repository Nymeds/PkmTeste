# 🎮 Pokémon Desktop Pet

Um pet de desktop interativo inspirado em Pokémon que anda na barra de tarefas do Windows/Mac/Linux.

## ✨ Recursos

- 🎬 **GIFs Totalmente Animados** - Suporte completo para sprites animados
- 🎯 **Sistema de Captura** - Capture Pokémon selvagens com chances baseadas em raridade
- 📈 **Sistema de XP e Level** - Seus Pokémon ganham XP e sobem de nível
- 🎲 **Spawns Aleatórios** - Pokémon selvagens aparecem automaticamente
- 👥 **Time de até 6 Pokémon** - Monte seu time dos sonhos
- 💾 **Persistência** - Seu progresso é salvo automaticamente

## 🔧 Como Usar

### Instalação
```bash
npm install
npx prisma generate
```

### Executar
```bash
npm start
```

## 🎬 Novidade: GIFs Animados!

### ✅ Problema Resolvido
Os GIFs agora **animam perfeitamente** no desktop! Anteriormente apareciam estáticos/travados.

**Como funciona:**
- GIFs são renderizados como elementos HTML animados
- PNGs são renderizados no canvas tradicional
- Tamanho otimizado: 64x64 pixels (antes 80x80)

### Adicionar seus próprios GIFs:
```
/app/pokedex/[nome-pokemon]/[nome-pokemon].gif
```

**Requisitos:**
- Tamanho: ~64x64 pixels
- Taxa: 10-20 FPS
- Tamanho: < 100KB
- Fundo: Transparente

### Testar detecção:
```bash
node test_gif_loading.js
```

## 📁 Estrutura

```
/app/
├── src/              - Código fonte
│   ├── main.js       - Processo principal Electron
│   ├── pet.js        - Lógica dos pets e renderização
│   ├── index.html    - Janela principal
│   └── card.html     - Card de informações
├── pokedex/          - Dados e sprites dos Pokémon
│   ├── bulbasaur/    ✅ GIF animado
│   ├── charmander/   ⚪ PNG estático
│   └── ...
└── prisma/           - Banco de dados SQLite
```

## 🎮 Controles

- **Clique no Pokémon**: Tentar capturar (apenas selvagens)
- **ESC**: Cancelar captura
- **ESC** (tela principal): Fechar aplicativo

## 🎯 Sistema de Captura

### Chances por Raridade:
- 🟢 Starter: **45%**
- 🔵 Comum: **60%**
- 🟡 Incomum: **40%**
- 🟠 Raro: **25%**
- 🔴 Lendário: **10%**

### Processo:
1. Clique no Pokémon selvagem
2. Aguarde 3 tremidas da pokébola
3. ✅ Capturado ou ❌ Escapou

## 📈 Sistema de XP

- Pokémon do time ganham **5 XP a cada 3 segundos**
- XP é salvo automaticamente no banco de dados
- Stats aumentam ao subir de nível

## 📚 Documentação

- 📖 **[COMO_USAR.md](COMO_USAR.md)** - Guia completo de uso
- 🔧 **[GIF_FIX_SUMMARY.md](GIF_FIX_SUMMARY.md)** - Detalhes técnicos da correção de GIFs
- 📋 **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Resumo da implementação

## 🐛 Solução de Problemas

### Reinstalar dependências:
```bash
rm -rf node_modules
npm install
npx prisma generate
```

### Resetar banco de dados:
```bash
rm prisma/dev.db
npx prisma migrate dev
```

## 🎨 Tecnologias

- **Electron 31.7.7** - Framework desktop
- **Canvas API** - Renderização de sprites estáticos
- **HTML/CSS** - Renderização de GIFs animados
- **Prisma + SQLite** - Banco de dados
- **Node.js** - Runtime

## ✅ Status

| Pokémon | Sprite | Status |
|---------|--------|--------|
| Bulbasaur | 🎬 GIF | ✅ Animado |
| Charmander | 🖼️ PNG | ⚪ Estático |
| Squirtle | 🖼️ PNG | ⚪ Estático |
| Pikachu | 🖼️ PNG | ⚪ Estático |
| Dragonite | 🖼️ PNG | ⚪ Estático |

## 📝 Notas

- **Performance**: GIFs < 100KB recomendado
- **Compatibilidade**: Windows, Mac, Linux
- **Electron**: v31.7.7 testado e funcional

---

**Desenvolvido com ❤️ usando Electron**
