# Diagnóstico dos dois núcleos

Data: 2026-11-04  
Fonte funcional: `/Users/gustavo/Downloads/CELBREA_IA-20261104T183307Z-1-001.zip`  
Pasta de referência: `CELBREA_IA/celbrea-ia/` (aplicativo publicado em um único `index.html`, schema Supabase e guia de instalação).  
Os arquivos em `PASTAS ZIPADAS/` são versões anteriores ou empacotamentos Netlify. Não entram como fonte de verdade.

O mockup Celbrea Care (`mockup/`) continua sendo a casca operacional: linha de cuidado, dashboard, estoque, georreferência de São Paulo, cohorts, mensageria e idiomas PT/EN/ES. Ele não calcula o teste térmico.

## Núcleo funcional CELBREA.IA

Aplicativo de uso clínico em um arquivo, com persistência em Supabase (região São Paulo) e publicação pensada para Netlify.

| Bloco | O que já funciona |
|---|---|
| Acesso | Cadastro de profissional, confirmação de e-mail, senha, termo LGPD versionado, fila de liberação pelo administrador |
| Banco | Tabelas `profissionais`, `registros` (JSON do formulário), `aceites_lgpd`; RLS; papéis `profissional` e `admin` |
| Ficha do teste | Identificação da paciente, solicitante, precauções, peso e altura, histórico hormonal e reprodutivo, mamas e risco, exames de imagem, observações, consentimento |
| Dispositivo | Seis sensores: seções A, B e C, lados esquerdo e direito; 18 colunas por sensor; QR de rastreabilidade por lado |
| Leitura | Manual ou automática por foto no próprio aparelho. A foto não é enviada nem gravada |
| Regra | Coluna válida com 3 ou mais pontos. Leitura = coluna ativada mais alta. Inconclusivo se qualquer sensor ficar em 2 ou menos. Significativo se a diferença espelhada for de 4 colunas ou mais (cerca de 1,11 °C). Caso contrário, não significativo |
| Saída | Laudo para a paciente, resumo, lista de registros, exportação em planilha, gestão de profissionais e de aceites |
| Sessão | Encerra ao fechar o navegador e após 15 minutos sem uso |

Estados internos do teste: `pend` (leituras incompletas), `inc` (inconclusivo), `alt` (significativo), `ok` (não significativo).

O `config.js` do pacote ainda está com placeholders. Não há chave real no zip analisado.

## Núcleo do mockup Celbrea Care

Demonstração estática, sem backend.

| Bloco | Papel na prova |
|---|---|
| Login e idiomas | Entrada institucional PT/EN/ES |
| Dashboard Celbrea | Estoque, unidades, geo São Paulo, positivos e negativos agregados |
| Torre | Filas, TAT, gargalos |
| Nova triagem | Fluxo de campo (hoje simulado) |
| Score e elegibilidade | Prioridade e regra de rastreio (hoje simulados) |
| Referência e navegador | Guia e BI-RADS (hoje simulados) |
| Ficha, cohorts, arquivo, mensageria | Acompanhamento da linha de cuidado |

## O que cada núcleo não faz

CELBREA.IA não opera estoque, georreferência municipal, cohorts, mensageria, referência SISREG nem contrarreferência BI-RADS.

Celbrea Care não lê o adesivo, não aplica a regra das colunas e não persiste teste real.

## Contrato mínimo entre os núcleos

Um teste concluído precisa virar um evento único, sem copiar o HTML clínico para dentro do mockup.

```
TesteCelbrea
  id
  paciente (nome, identificador, nascimento, peso, altura)
  unidade e profissional
  data_teste
  leituras: A/B/C x E/D (0–18)
  qr_esquerdo, qr_direito
  status: pend | inc | alt | ok
  maior_diferenca_colunas
  delta_celsius
  segmento_mais_quente
  consentimento
```

Tradução para a linha de cuidado, só na prova de conceito:

| Status do teste | Efeito no Care |
|---|---|
| `ok` | Ciclo preventivo; entra no painel de negativos |
| `alt` | Abre guia de referência prioritária; entra no painel de positivos |
| `inc` | Não gera referência; pede repetição; não conta como exame válido no estoque consumido com resultado |
| `pend` | Rascunho; não aparece nos gráficos |

BI-RADS, fila do navegador e laudo de imagem continuam manuais ou simulados até existir integração com imagem. O teste térmico não substitui o laudo estrutural.

## Riscos

- O aplicativo clínico é um monólito. Fundir os dois HTMLs quebra manutenção, idioma e a regra de interpretação.
- A leitura por foto depende de câmera, luz e geometria do adesivo. A prova de bancada da regra numérica não depende da câmera; a prova da foto depende de bancada física.
- Dados de paciente exigem ambiente separado de demonstração (projeto Supabase próprio, sem prontuário real na primeira prova).
- O limiar e a conduta descritos no aplicativo são protocolo do dispositivo. A documentação da prova deve citar a fonte interna do app e não reescrever o critério.
- Chaves `service_role` não entram no front. A chave anon só vale com RLS já aplicado pelo `schema.sql`.
