# Spec: incrementar o CELBREA.IA com a maquete

Data: 2026-11-09  
Repositório: https://github.com/jgustavobarbosa/celbreatech.git  
Sistema que manda: `clinical/` (pacote CELBREA.IA)  
Maquete: `mockup/` (referência de interface, não substitui o pacote)  
Publicação atual: http://2.25.107.115/celbrea/

## Decisão

O pacote continua sendo o produto. A maquete não é reescrita por cima dele e os números de demonstração de São Paulo não entram como prontuário.

Entra no pacote somente o que ele ainda não faz. A primeira entrega é referência e contrarreferência, porque o pacote já classifica o teste e ainda não conduz a paciente até o exame de imagem nem registra o retorno.

O que o pacote já faz permanece: cadastro e liberação do profissional, termo LGPD, ficha, precauções, questionário, histórico, leitura por foto ou manual, regra das colunas, laudo, registros, exportação e parâmetros.

## O que a maquete acrescenta, e em que ordem

| Ordem | Incremento | Por que nesta ordem |
|---|---|---|
| 1 | Referência e contrarreferência | Único fluxo novo que usa o resultado que o pacote já grava |
| 2 | Fila do navegador | Lista, dentro de Registros, as referências abertas e as contrarreferências pendentes |
| 3 | Painel do que foi gravado | Contagens reais de testes `ok`, `alt` e `inc`. Sem inventar estoque nem mapa |
| 4 | Estoque, território, cohorts e mensagens | Só depois de a referência estar homologada. Não nesta spec |

Fora desta spec: trocar a regra térmica, traduzir o laudo, SISREG, PACS e apagar ou redesenhar as abas do pacote.

## Regras de referência e contrarreferência

A classificação do teste não muda.

| Status já gravado pelo pacote | Efeito novo |
|---|---|
| `alt` (significativo) | Pode abrir referência para exame de imagem. Status da guia: aguardando imagem. Não é BI-RADS. |
| `ok` (não significativo) | Ciclo preventivo. Não abre referência. |
| `inc` (inconclusivo) | Repetir o teste. Não abre referência e não conta como exame válido. |
| `pend` | Rascunho. Não abre referência. |

Contrarreferência só existe se houver referência aberta. O BI-RADS é do exame de imagem, digitado pelo profissional:

| BI-RADS | Conduta |
|---|---|
| 1 ou 2 | Devolve ao ciclo preventivo e encerra a guia |
| 3 | Seguimento curto |
| 4 ou 5 | Encaminha para biópsia |

A linha fica no próprio registro, no campo `cuidado`, para não criar tabela nova antes da homologação. Salvar o teste de novo não apaga `cuidado`.

## Fases

Cada fase termina com um registro curto no próprio spec, na seção Histórico. Não se pula fase.

### 1. Elaboração

Este documento. Descreve o que entra, o que fica de fora e o critério de pronto.

Pronto quando o texto distingue pacote e maquete e fixa a ordem da tabela acima.

### 2. Revisão do spec

Leitura deste arquivo antes de alterar o aplicativo de novo. A revisão responde só isto:

- Alguma regra térmica foi alterada? Se sim, o spec está reprovado.
- A referência abre para outro status além de `alt`? Se sim, reprovado.
- A contrarreferência grava BI-RADS sem referência aberta? Se sim, reprovado.
- A maquete substitui alguma aba do pacote? Se sim, reprovado.

### 3. Implementação

No aplicativo do pacote, aba Cuidado, sem mudar `result()` nem `CRIT`.

Arquivos previstos:

- `clinical/care.js`: regras puras
- `clinical/care.test.js`: casos da tabela
- `clinical/index.html`: aba e gravação, preservando o restante do pacote

A maquete permanece em `mockup/` como desenho. Não é a tela do profissional.

O rascunho local da aba Cuidado e a cópia já enviada à VPS em `/var/www/celbrea/` são a implementação candidata. Só entram no git nesta fase, depois da revisão do spec.

### 4. Teste

```bash
node --test clinical/care.test.js
```

Casos obrigatórios:

- `alt` abre referência e conta exame válido
- `ok` não abre referência
- `inc` não abre referência e não conta exame válido
- BI-RADS 2 encerra a guia e devolve ao preventivo
- BI-RADS 4 pede biópsia
- contrarreferência sem guia é recusada
- dois testes com o mesmo identificador formam uma paciente

Teste manual, com profissional liberado e consentimento da paciente:

1. Salvar um teste significativo e abrir a referência.
2. Registrar BI-RADS 2 e ver a guia encerrada.
3. Salvar de novo o mesmo teste e confirmar que a linha de cuidado continua.
4. Salvar um teste não significativo e confirmar que não há botão de referência.

### 5. Correção

Só o que os testes ou o roteiro manual mostrarem. Não se aproveita a correção para trazer estoque, mapa ou outro bloco da maquete.

### 6. Documentação

Atualizar `clinical/guia.html` com a aba Cuidado: quando a referência abre e o que cada BI-RADS faz. O guia de instalação do Supabase permanece.

### 7. Revisão

Conferir o diff do pacote:

- `CRIT` e `result()` iguais aos do ZIP
- foto continua sem upload
- `config.js` com chave real não entra no git
- texto do laudo não foi reescrito
- resultado térmico não é rotulado como BI-RADS nem como diagnóstico

### 8. Homologação

Ambiente: http://2.25.107.115/celbrea/clinical/index.html  
Não homologar na maquete.

A prova usa dados sintéticos. Um profissional liberado percorre os passos do teste manual. A homologação fecha quando os quatro passos passam e o Rayjud, na mesma VPS, continua respondendo.

Registro da homologação: data, quem executou, endereço e o resultado de cada passo. Sem isso, a fase 3 não se considera fechada no git da branch principal.

## Git

O spec entra em `docs/specs/` neste repositório. A implementação da aba Cuidado entra no git só depois da fase 2. A publicação na VPS continua em `/var/www/celbrea/`, sem alterar o site `rayjud.duckdns.org`.

## Histórico

| Fase | Estado | Nota |
|---|---|---|
| 1. Elaboração | escrita em 2026-11-09 | este arquivo |
| 2. Revisão do spec | aberta | aguarda leitura antes de novo código |
| 3 a 8 | não iniciadas no git | rascunho da aba Cuidado existe só na pasta local e na VPS |
