@echo off
setlocal enabledelayedexpansion
set JAR=backend\target\securebank-0.1.0.jar
if not exist "%JAR%" (
  echo Jar nao encontrado em %JAR%
  echo Baixe o artifact 'securebank-jar' do GitHub Actions e coloque em backend\target\
  exit /b 1
)
java -jar "%JAR%"
