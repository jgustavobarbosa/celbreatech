# Dashboard Celbrea ancorado no exame

Data: 2026-11-10  
Sistema que manda: `clinical/`  
Maquete: `mockup/` só como mapa de telas. Os números de São Paulo e o score 78/24 não entram no banco.

O teste da Maria José permanece a prova. Se ela não aparecer na ficha, na fila e na recorrência com o mesmo resultado do exame, a tela não está pronta.

## Decisão

Um login, um banco, uma paciente. O dashboard é uma casca em `clinical/dashboard.html` que lê `registros`, `usuarios`, `matriculas` e `mensagens`. Nova triagem abre o exame que já existe. Não há segunda classificação térmica e não há segunda ficha.

A paciente se agrupa por `idPaciente`. Sem esse número, o agrupamento usa o nome, como o pacote já faz. Essa ficha é o modelo de todos os cadastros futuros: a primeira paciente e as próximas passam pelos mesmos capítulos, pela mesma fila e pela mesma recorrência. Nenhuma tela trata um nome como caso especial.

## O que a maquete mostra e de onde vem

| Tela | Fonte | Regra |
|---|---|---|
| Dashboard Celbrea | `registros` da sessão autorizada | Conta `ok`, `alt`, `inc` e referências abertas. Sem meta inventada |
| Torre de controle | as mesmas contagens, por estado e unidade já cadastrados | Estado vem do vínculo da paciente. Unidade vazia fica como “sem unidade” |
| Nova triagem | `clinical/index.html` | Abre o exame da paciente escolhida. A leitura continua no adesivo |
| Fila do navegador | `dados.cuidado` com referência aberta ou contrarreferência pendente | `alt` entra na fila de imagem. `ok` e `inc` não entram |
| Ficha do paciente | ficha do exame + anamnese + exames anteriores da mesma paciente | A Maria José abre a ficha com o teste que já foi salvo |
| Cohorts e recorrência | status do exame e data de retorno | `ok`: retorno em 12 meses. `inc`: repetir, não é exame válido. `alt`: não vira cohort preventivo |
| Arquivo | registros já salvos | Lista, abre e exporta o que já está em Registros |
| Mensageria | tabela `mensagens` | Cada mensagem aponta para a paciente e, quando houver, para o `registro_id` |

## Capítulos

Os dezesseis botões deixam de ser aviso. Cada um abre um recorte da mesma ficha ou do mesmo exame.

| Capítulo | Abre |
|---|---|
| 01 Cadastro | identificação já gravada na ficha |
| 02 Vínculo | estado, unidade e matrícula |
| 03 Anamnese | perguntas já existentes no exame |
| 04 Clínicos | altura, peso, história, BRCA, biópsia, família |
| 05 Escaneamento | IDs dos adesivos e fotos, que continuam no aparelho |
| 06 Triagem | resultado térmico do exame, sem recalcular a regra |
| 07 Score / lei | prioridade da linha de cuidado já definida: imagem, preventivo ou repetir |
| 08 Referência | referência só quando o resultado é `alt` |
| 09 Contrarreferência | BI-RADS já registrado no cuidado |
| 10 Acompanhamento | matrícula e elemento preditivo já gravados |
| 11 Mensageria | mensagens daquela paciente |
| 12 Recorrência | data do próximo retorno |
| 13 Grupos | cohort em que a paciente entrou |
| 14 Arquivo | histórico dos exames dela |
| 15 Predição | elemento preditivo da conduta, não um modelo novo |
| 16 Torre | a paciente contada na torre do estado dela |

O capítulo 07 não cria um score numérico de risco. A maquete mostra 78 e 24 como demonstração. No produto, a prioridade é a conduta do exame: referência, ciclo preventivo ou repetição.

## Ordem

1. Casca com o mesmo login do exame e as oito telas de operação, vazias de número falso.
2. Ficha da paciente lendo o exame salvo. A Maria José é o primeiro caso.
3. Mensagens ligadas à ficha e ao exame.
4. Cohort e data de recorrência derivados do status, gravados na matrícula.
5. Fila do navegador só com referência ou contrarreferência aberta.
6. Capítulos como atalhos desses recortes.
7. Torre com contagem real por estado.
8. Homologação: entrar como administradora, abrir a Maria José, ver o mesmo resultado no exame, na ficha, na mensagem, no cohort e na torre.

## Fora deste ciclo

- WhatsApp e SMS. A mensageria continua dentro do sistema. O e-mail já existente permanece o da Resend.
- Mapa, estoque e população fictícia da maquete.
- Novo modelo de predição além do elemento já ligado à conduta.
- SISREG e PACS.

## Pronto quando

- A Maria José aparece uma vez, com o resultado do teste já feito.
- Nova triagem abre o exame dela, não um formulário paralelo.
- Uma mensagem fica na ficha dela.
- O retorno previsto aparece em Cohorts e no capítulo 12.
- A torre não mostra paciente que o exame não tem.
