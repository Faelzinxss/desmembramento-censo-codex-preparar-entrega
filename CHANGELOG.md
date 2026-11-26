# Changelog

## 12/11/2026

- Simulador passa a rejeitar estados de carga inválidos antes do envio de estágio. Adicionada cobertura da retomada parcial e do bloqueio de plano incompleto.

- Reunidas as branches de planejamento Azure e melhorias de fila na preparação de entrega.
- Criado o guia de entrega com inventário de ativos, arquivos privados, pendências e critérios de aceite.
- Validação local da integração aprovada em 90 testes Python, 39 testes Node e build Vite.

## 22/10/2026 — Regra de verificação de matrícula em vermelho

- Registrada a regra operacional: lote com matrícula que permanece vermelha no envio fica pendente de verificação humana, incluindo conferência de possível ausência de CPF. Automação ainda pendente.

## 21/10/2026 — Python portátil entre computadores

- A atualização passou a usar um ambiente Python próprio de cada Windows em `%LOCALAPPDATA%`, fora do OneDrive.
- Caminhos de Python salvos em outro computador agora possuem fallback para o executável local funcional.
- Foi adicionado `manutencao/PREPARAR_AMBIENTE_PYTHON.bat` para instalar `requests` e `pyodbc` sem copiar `.venv` entre máquinas.
- Quando disponível, o Azure CLI fornece um token temporário em memória para a leitura SQL e evita o erro WAM `0x534` do login ODBC interativo. O botão seleciona explicitamente o tenant da fonte para impedir a recusa `18456` causada por token emitido para outro diretório.

## 17/10/2026 — Continuidade entre casa, empresa e nuvem

- O GitHub passou a ser documentado como referência compartilhada do projeto.
- Foram adicionados um resumo operacional vigente e instruções específicas para desenvolvimento em nuvem, sem valores secretos.
- `AGENTS.md` agora descreve como iniciar e encerrar trabalho em qualquer computador preservando mudanças locais.
- Foi verificado que o repositório não possui workflow de deploy; a configuração externa de branches do Cloudflare continua pendente de confirmação.

## Unreleased

### Added

- documentação de arquitetura, regras de dados, decisões e continuidade entre sessões;
- entrada Azure SQL com snapshot validado e seletor local da fonte oficial;
- testes da fonte Azure, links próprios e otimização do planejamento;
- diagnósticos e SQLs para política Azure, links e timeout de planejamento.

### Changed

- rotina diária passa pelo seletor de fonte oficial;
- preparação registra origem Azure e contrato dos links;
- aplicação protege matrículas relacionadas a reservas de casos ausentes;
- atividade vazia de prioridades é normalizada para `null` no frontend.

### Fixed

- link de cada lado da comparação passa a vir da própria matrícula;
- mensagens de timeout do planejamento identificam a RPC responsável.
- aplicação confirma que a transição de estado da carga realmente atualizou uma linha e interrompe se outra execução mudou o estado.

### Known issues

- a primeira carga Azure documentada ficou parcial e requer conferência remota.
