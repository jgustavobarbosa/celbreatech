# Plano: agregar CELBREA.IA ao Celbrea Care

Data: 2026-11-04  
Objetivo: prova de bancada da regra de leitura e prova de conceito da linha de cuidado usando o núcleo que já classifica o teste.

Fora deste ciclo: produção clínica, SISREG real, PACS, estoque com nota fiscal, modelo preditivo treinado.

## Decisão de arquitetura

Manter dois módulos e um contrato.

1. **Motor clínico** — o `celbrea-ia` atual, extraído para `clinical/` no repositório, sem reescrever a regra na primeira entrega. Continua responsável por ficha, foto, colunas, classificação, laudo e gravação do teste.
2. **Casca Care** — o `mockup/` atual. Continua responsável por dashboard, estoque, território, referência, navegação, cohorts e mensageria.
3. **Adaptador** — função pura que lê o registro salvo (`registros.dados`) e devolve o `TesteCelbrea` do diagnóstico. A casca consome só esse objeto.

A Nova triagem do mockup deixa de simular o resultado térmico. Ela abre o motor clínico (rota ou iframe de mesma origem) e, ao salvar, volta para a ficha Care já com status real.

Idiomas PT/EN/ES permanecem na casca. O motor clínico entra em português na prova. Tradução do laudo fica para depois da bancada da regra.

## Prova de bancada

Objetivo: mostrar que a classificação não muda quando sai do HTML e passa pelo adaptador.

Bancada numérica (sem câmera, sem Supabase):

| Caso | Leituras A/B/C E e D | Esperado |
|---|---|---|
| B1 | Todas as seções com diferença 0 a 3 e nenhuma leitura ≤ 2 | `ok` |
| B2 | Uma seção com diferença 4; demais válidas | `alt`, segmento da leitura maior |
| B3 | Qualquer sensor com leitura 2 | `inc`, mesmo se outra seção tiver diferença alta |
| B4 | Coluna com 1 ou 2 pontos e outra com 3 | Só a coluna com 3 ou mais define a leitura |
| B5 | Uma seção sem leitura | `pend` |
| B6 | Diferença 4 | delta exibido 1,11 °C (4 × 0,278) |

Bancada física (adesivo real ou foto de arquivo controlada):

| Caso | Procedimento | Esperado |
|---|---|---|
| F1 | Foto nítida dos dois lados, 15 min de protocolo descrito no app | Leitura automática coincide com contagem manual de colunas com ≥ 3 pontos |
| F2 | Foto com reflexo ou coluna isolada | App pede nova foto ou marca artefato, sem promover coluna inválida |
| F3 | QR dos dois lados | Lote fica no registro e no evento Care |
| F4 | Sessão ociosa 15 min | Encerra e não grava rascunho sem consentimento |

Critério de saída da bancada: B1–B6 automatizados e iguais ao `function result()` atual; F1 conferido por duas pessoas na mesma foto.

## Prova de conceito

Um caminho só, com dados sintéticos de São Paulo:

1. Profissional liberado entra na casca Care.
2. Abre Nova triagem e conclui um teste no motor clínico (manual é suficiente; foto é opcional nesta prova).
3. Status `alt` gera a guia de referência já desenhada no mockup e aparece na fila do navegador como “aguardando imagem”, não como BI-RADS.
4. Status `ok` atualiza a ficha para ciclo preventivo e soma no bloco de negativos do dashboard.
5. Status `inc` não abre referência e não incrementa exames válidos.
6. Dashboard mostra a unidade de demonstração com +1 realizado e −1 em estoque somente quando o teste foi salvo com consentimento.
7. Troca de idioma na casca não altera os números do teste.

Critério de saída: os três status percorridos ao vivo em até 15 minutos, sem editar JSON na mão.

## Desenvolvimento

Ordem obrigatória. Cada passo deixa o anterior utilizável.

### D1. Isolar o motor

- Copiar `celbrea-ia/` para `clinical/` (index, config de exemplo, schema, headers, manifest, ícones, guia).
- `config.example.js` no git. `config.js` no `.gitignore`.
- Não alterar `CRIT` nem `result()` neste passo.
- Servir `clinical/` e `mockup/` na mesma origem local para evitar bloqueio de iframe.

### D2. Extrair a regra para teste

- Copiar para `clinical/engine.js` apenas: limiares, validação da coluna, `result()` e conversão °C.
- O `index.html` passa a chamar esse arquivo, com o mesmo resultado dos casos B1–B6.
- Se a extração divergir, o HTML original permanece e a extração é refeita. Não se “corrige” o critério para o teste passar.

### D3. Adaptador

- `clinical/adapter.js` monta `TesteCelbrea` a partir do objeto que hoje vai para `registros.dados`.
- Campos mínimos: status, leituras, maior diferença, delta, QR, peso, altura, idade derivada da data de nascimento, consentimento, ids.

### D4. Ligação com a casca

- Na Nova triagem, o passo do pad deixa de ser o desenho simulado como fonte do resultado.
- Ao receber `TesteCelbrea`, a ficha, a guia e os contadores do dashboard usam esse objeto.
- Referência automática apenas para `alt`.
- BI-RADS continua ação explícita do navegador.

### D5. Persistência da prova

- Projeto Supabase separado, só demonstração, região São Paulo, `schema.sql` aplicado.
- Casca lê registros do profissional logado. Sem service role no navegador.
- Se o Supabase não estiver disponível no dia da prova, a casca aceita o evento em memória e deixa isso declarado na tela.

## Testes

| Nível | Onde | O que prova |
|---|---|---|
| Unidade | `clinical/engine.test.js` com Node, sem browser | B1–B6 e a conversão 4 colunas = 1,11 °C |
| Contrato | `clinical/adapter.test.js` | JSON real de um registro de exemplo vira `TesteCelbrea` sem campos clínicos a mais |
| Interface | Roteiro manual de 15 min | PoC dos três status, idioma e estoque |
| Bancada foto | Roteiro F1–F4, duas pessoas | Leitura automática versus contagem manual |
| Segurança | Checklist | RLS: profissional inativo não lê; não admin não apaga; anon não grava |

Não há suíte de browser automatizada neste ciclo. O mockup não tem empacotador; acrescentar um só para a prova atrasaria a bancada.

Comando previsto após D2:

```bash
node --test clinical/engine.test.js clinical/adapter.test.js
```

## Implementação (fatias)

| Fatia | Entrega verificável | Depende de |
|---|---|---|
| 1 | `clinical/` abre local e classifica como hoje | — |
| 2 | Testes B1–B6 verdes contra `engine.js` | 1 |
| 3 | Adaptador cobre um registro de exemplo | 2 |
| 4 | Casca mostra status real na ficha e não abre guia em `ok` ou `inc` | 3 |
| 5 | Dashboard e estoque reagem a um teste salvo | 4 |
| 6 | Supabase demo + primeiro admin, seguindo o guia já existente | 1 |
| 7 | Roteiro de bancada física com fotos de arquivo | 2 |

Fatia 6 pode correr em paralelo com 2–5. A prova de conceito aceita memória local se a fatia 6 falhar por conta ou DNS. A prova de bancada numérica não depende da fatia 6.

## Revisão

Antes de chamar a prova de encerrada:

- Comparar `result()` antigo e `engine.js` nos seis casos. Divergência bloqueia.
- Confirmar que foto não é persistida (rede do navegador sem upload da imagem).
- Confirmar que `config.js` não foi commitado.
- Confirmar que texto de conduta do laudo não foi reescrito.
- Confirmar que positivo térmico não é rotulado como BI-RADS nem como diagnóstico.
- Revisar termo LGPD do motor: a instituição da prova é a controladora; o repositório público não recebe cadastro real.
- Acessibilidade mínima do caminho da prova: botões com nome, foco visível no fluxo Novo teste → resultado → ficha.

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `docs/integracao/01_DIAGNOSIS_NUCLEOS.md` | Este mapa |
| `docs/integracao/02_PLAN_POC_BANCADA.md` | Este plano |
| `clinical/GUIA-DE-INSTALACAO.md` | Mantido, com nota de que a casca Care é outra origem na prova |
| `docs/integracao/03_ROTEIRO_PROVA.md` | Passo a passo de 15 minutos e tabela B1–B6 / F1–F4 para preencher na bancada |
| `README.md` | Um parágrafo apontando motor, casca e como subir os dois estáticos |

O roteiro da prova só é escrito na fatia 2, quando os casos já estiverem fixos no teste automático.

## O que não entra na prova

- Reescrever o CELBREA.IA em React ou no visual do mockup.
- Traduzir o laudo para inglês e espanhol.
- Integrar SISREG, e-SUS ou PACS.
- Treinar modelo de visão novo. A leitura por foto atual permanece.
- Usar paciente identificável ou foto de pessoa.
- Publicar a chave do Supabase.

## Sequência recomendada de execução

Bancada numérica (D1–D2) primeiro. Sem ela, a casca só embrulha um resultado que não se consegue auditar.

Depois o adaptador e um status `alt` visível na ficha (D3–D4). Isso já é a prova de conceito mínima.

Estoque, dashboard e Supabase fecham a prova institucional. A foto fica por último e não bloqueia o restante.
