# Plano de implementação: módulos de acesso e operação

Data: 2026-11-09  
Sistema que manda: `clinical/`  
Spec anterior: `docs/specs/2026-11-09-incremento-pacote.md`

A regra térmica não entra neste plano. Foto continua no aparelho. Mensagem não sai para WhatsApp, e-mail ou SMS neste ciclo.

## O que já é funcionalidade do pacote

| Módulo | Onde está | O que faz |
|---|---|---|
| Autenticação | entrada do `clinical/index.html` | E-mail, senha, confirmação e termo LGPD do profissional |
| Aprovação | Registros, lista de profissionais | Administrador libera ou bloqueia o profissional. Sem liberação não há leitura de testes |
| Versão do médico | `clinical/index.html` | Ficha, leitura, resultado, laudo, registros e aba Cuidado |

## O que este ciclo acrescenta

| Módulo | Onde fica | Limite |
|---|---|---|
| Vinculação | Aba Cuidado, cadastros | Usuário, unidade, matrícula e teste já gravado em `registros` |
| Versão da paciente | `clinical/paciente.html` | Explica o resultado. Não lista pacientes e não pede senha de profissional |
| Dashboard do gestor | Aba Cuidado | Conta testes `ok`, `alt`, `inc` e referências abertas que existem na sessão |
| Administração automática | Aba Cuidado | Propõe a conduta da regra. Só grava se o profissional confirmar. Não muda a classificação |
| Mensageria | Aba Cuidado e `mensagens.sql` | Rascunho e mensagem pronta, dentro do sistema. Não envia para fora |

## Ordem de implementação

1. Autenticação e aprovação do profissional. Já estão no pacote. Não criar outro login.
2. Versão do médico. É o próprio aplicativo.
3. Vinculação, referência e contrarreferência. Já especificadas no spec anterior.
4. Dashboard do gestor com contagem real.
5. Administração automática como proposta confirmada pelo profissional.
6. Mensageria interna.
7. Versão da paciente, sem prontuário aberto.
8. Homologação no endereço do pacote, com dado sintético.

## Fora deste ciclo

- Conta e senha para a paciente.
- Envio automático por WhatsApp, e-mail ou SMS.
- Aprovação automática de profissional.
- Estoque, mapa e cohorts da maquete.
- SISREG e PACS.

## Pronto quando

- O profissional entra e, sem liberação, não vê testes.
- O gestor vê contagens coerentes com os testes salvos.
- A proposta de referência só aparece no resultado significativo e só grava depois do clique.
- A mensagem fica em rascunho ou pronta, sem status de envio externo.
- A página da paciente não mostra a lista de outras pessoas.
