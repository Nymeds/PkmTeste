#!/bin/bash

# Script de configuração automática do Pokémon Desktop Pet
# Execute com: bash setup.sh

echo "🎮 Pokemon Desktop Pet - Setup Automático"
echo "=========================================="
echo ""

# Verifica se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado! Por favor, instale o Node.js primeiro."
    echo "   Download: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo ""

# Instala dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas com sucesso!"
echo ""

# Configura Prisma
echo "🗄️  Configurando Prisma..."
npx prisma generate
npx prisma migrate dev --name init

if [ $? -ne 0 ]; then
    echo "❌ Erro ao configurar Prisma"
    exit 1
fi

echo "✅ Prisma configurado com sucesso!"
echo ""

# Cria estrutura da Pokédex
echo "📁 Criando estrutura da Pokédex..."
mkdir -p pokedex/pikachu
mkdir -p pokedex/charmander
mkdir -p pokedex/squirtle
mkdir -p pokedex/bulbasaur
mkdir -p pokedex/dragonite

echo "✅ Estrutura criada!"
echo ""

# Cria arquivos stats.json
echo "📝 Criando arquivos stats.json..."

# Pikachu
cat > pokedex/pikachu/stats.json << 'EOF'
{
  "name": "Pikachu",
  "type": ["Electric"],
  "baseStats": {
    "hp": 35,
    "attack": 55,
    "defense": 40,
    "speed": 90
  },
  "xpPerLevel": 100,
  "hpGrowth": 5,
  "attackGrowth": 3,
  "defenseGrowth": 2,
  "speedGrowth": 4,
  "color": "#F4D03F",
  "description": "Este Pokémon elétrico tem bochechas que faíscam com eletricidade."
}
EOF

# Charmander
cat > pokedex/charmander/stats.json << 'EOF'
{
  "name": "Charmander",
  "type": ["Fire"],
  "baseStats": {
    "hp": 39,
    "attack": 52,
    "defense": 43,
    "speed": 65
  },
  "xpPerLevel": 100,
  "hpGrowth": 6,
  "attackGrowth": 4,
  "defenseGrowth": 2,
  "speedGrowth": 3,
  "color": "#F08030",
  "description": "A chama em sua cauda indica seu estado vital."
}
EOF

# Squirtle
cat > pokedex/squirtle/stats.json << 'EOF'
{
  "name": "Squirtle",
  "type": ["Water"],
  "baseStats": {
    "hp": 44,
    "attack": 48,
    "defense": 65,
    "speed": 43
  },
  "xpPerLevel": 100,
  "hpGrowth": 7,
  "attackGrowth": 2,
  "defenseGrowth": 4,
  "speedGrowth": 2,
  "color": "#6890F0",
  "description": "Pode disparar jatos d'água com grande precisão."
}
EOF

# Bulbasaur
cat > pokedex/bulbasaur/stats.json << 'EOF'
{
  "name": "Bulbasaur",
  "type": ["Grass", "Poison"],
  "baseStats": {
    "hp": 45,
    "attack": 49,
    "defense": 49,
    "speed": 45
  },
  "xpPerLevel": 100,
  "hpGrowth": 6,
  "attackGrowth": 3,
  "defenseGrowth": 3,
  "speedGrowth": 2,
  "color": "#78C850",
  "description": "A semente em suas costas cresce junto com ele."
}
EOF

# Dragonite
cat > pokedex/dragonite/stats.json << 'EOF'
{
  "name": "Dragonite",
  "type": ["Dragon", "Flying"],
  "baseStats": {
    "hp": 91,
    "attack": 134,
    "defense": 95,
    "speed": 80
  },
  "xpPerLevel": 100,
  "hpGrowth": 8,
  "attackGrowth": 6,
  "defenseGrowth": 4,
  "speedGrowth": 3,
  "color": "#F16E57",
  "description": "Capaz de circundar o globo em 16 horas."
}
EOF

echo "✅ Arquivos stats.json criados!"
echo ""

echo "=========================================="
echo "🎉 Setup concluído com sucesso!"
echo ""
echo "⚠️  PRÓXIMOS PASSOS:"
echo "   1. Adicione as imagens PNG dos Pokémon nas pastas:"
echo "      - pokedex/pikachu/pikachu.png"
echo "      - pokedex/charmander/charmander.png"
echo "      - pokedex/squirtle/squirtle.png"
echo "      - pokedex/bulbasaur/bulbasaur.png"
echo "      - pokedex/dragonite/dragonite.png"
echo ""
echo "   2. Execute o aplicativo:"
echo "      npm start"
echo ""
echo "=========================================="