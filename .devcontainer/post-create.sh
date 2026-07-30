#!/bin/bash
set -e
echo "🚀 Configurando DevAssistant en GitHub Codespaces..."

# Instalar dependencias del proyecto
echo "📦 Instalando dependencias..."
npm install

# Crear directorio de datos para el vector store
mkdir -p data

# Crear .env desde template si no existe
if [ ! -f .env ]; then
  cp .env.template .env
  echo ""
  echo "✅ .env creado desde template"
  echo ""
  echo "⚠️  Importante: las API keys deben estar configuradas como"
  echo "   GitHub Codespaces Secrets (Settings → Codespaces → New secret):"
  echo "   - ANTHROPIC_API_KEY"
  echo "   - OPENAI_API_KEY"
  echo ""
  echo "   El devcontainer.json las inyecta automáticamente en el entorno."
else
  echo "✅ .env ya existe, no se sobreescribe"
fi

echo ""
echo "✅ DevAssistant listo."
echo ""
echo "Comandos disponibles:"
echo "  npm run dev            → CLI interactivo con el agente"
echo "  npm run demo           → Demo automatizada de 5 escenarios"
echo "  npm run ingest         → Ingestar documentación para RAG"
echo "  npm run review <file>  → Code reviewer con Claude"
echo ""