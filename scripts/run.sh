#!/usr/bin/env bash
set -euo pipefail
JAR="backend/target/securebank-0.1.0.jar"
if [ ! -f "$JAR" ]; then
  echo "Jar não encontrado em $JAR"
  echo "Baixe o artifact 'securebank-jar' do GitHub Actions e coloque em backend/target/"
  exit 1
fi
exec java -jar "$JAR"
