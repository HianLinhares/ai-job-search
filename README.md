<p align="center">
  <img src="assets/mascot/pip_flight_loop.gif" alt="Pip, o pássaro mensageiro" width="200">
</p>

# AI Job Search

*A busca de emprego que roda na sua máquina.*

<p align="center">
  <a href="https://trendshift.io/repositories/43622?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-43622" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/43622/daily" alt="MadsLorentzen%2Fai-job-search | Trendshift" width="250" height="55"/></a>
</p>

[![CI](https://github.com/MadsLorentzen/ai-job-search/actions/workflows/ci.yml/badge.svg)](https://github.com/MadsLorentzen/ai-job-search/actions/workflows/ci.yml)

Um framework de candidatura a emprego com IA, construído sobre o [Claude Code](https://claude.com/claude-code). Faça fork, preencha seu perfil e deixe o Claude avaliar vagas, adaptar seu CV, escrever cartas de apresentação e prepará-lo para entrevistas.

> Nota: Este é um projeto open-source independente e não é afiliado, endossado, patrocinado ou mantido pela Anthropic. Anthropic e Claude Code são mencionados apenas para descrever a cadeia de ferramentas que este fluxo de trabalho utiliza.
>
> Este projeto **não possui criptomoeda, token ou programa de patrocínio pago associado**. Qualquer coisa que afirme o contrário é não autorizada e deve ser tratada como golpe. As únicas formas de apoiar o projeto são o link do Ko-fi abaixo e contribuir no GitHub.

## Funciona de verdade?

Sou geofísico de formação. Quando minha posição foi encerrada no final de 2025, construí este framework para conduzir minha própria busca de emprego — o mesmo fluxo `/scrape`, `/apply` e `/interview` deste repositório, usado semanalmente, na minha própria carreira. Fui transparente sobre isso com todos os empregadores com quem conversei e, em vez de contar contra mim, geralmente desencadeava uma conversa técnica genuína.

Sessenta e nove candidaturas personalizadas, vinte primeiras entrevistas e um contrato assinado depois, comecei como engenheiro de IA em junho de 2026. As pessoas continuavam perguntando se isso realmente funciona. Me contratou. Agora é seu.

*A versão mais longa, incluindo o funil completo de candidaturas, está no [LinkedIn](https://www.linkedin.com/in/mads-lorentzen/).*

<p align="center">
  <i>Isso economizou um domingo escrevendo cartas de apresentação? Considere um café.<br>
  Conseguiu o emprego? Talvez dois.</i> ☕
</p>

<p align="center">
  <a href="https://ko-fi.com/madslorentzen">
    <img src="https://storage.ko-fi.com/cdn/kofi3.png?v=6" alt="Compre um café em ko-fi.com" height="40">
  </a>
</p>

## O que é isso

Um fluxo de trabalho estruturado que transforma o Claude Code em um assistente completo de candidatura a emprego. O fluxo principal (autoperfil, avaliação de fit e o pipeline de candidatura drafter-reviewer) é **agnóstico em relação a idioma e país**. As skills de busca em portais de emprego foram feitas para o mercado dinamarquês (Jobindex, Jobnet, Akademikernes Jobbank, etc.), mas o padrão foi projetado para ser trocado pelos sites de emprego locais.

```
/setup          /scrape              /apply <url>
  |                |                     |
  v                v                     v
Preencher      Buscar em            Avaliar fit
seu perfil     portais de emprego   Pontuar e recomendar
  |                |                     |
  v                v                     v
Arquivos de    Apresentar matches   Rascunhar CV + Carta
perfil prontos com notas de fit    (LaTeX, personalizados)
                   |                     |
                   v                     v
               Escolher um match    Agente revisor critica
               -> /apply            -> Revisar -> Resultado final
```

O framework codifica boas práticas de orientação de carreira, incluindo critérios estruturados de avaliação, enquadramento prospectivo em cartas de apresentação e benchmarking salarial opcional.

## Pré-requisitos

- [Claude Code](https://claude.com/claude-code) (CLI). Usando outra ferramenta de agente (Codex, Antigravity, Gemini CLI)? Comece em [`AGENTS.md`](AGENTS.md) — as skills de busca em portais funcionam lá de imediato, e [forks da comunidade](https://github.com/MadsLorentzen/ai-job-search/discussions/78) adaptam o fluxo completo.
- Python 3.10+
- [Bun](https://bun.sh) (para as ferramentas CLI de busca de emprego)
- Distribuição LaTeX com `lualatex` e `xelatex`: [TeX Live](https://tug.org/texlive/), [MacTeX](https://tug.org/mactex/), [TinyTeX](https://yihui.org/tinytex/) ou [MiKTeX](https://miktex.org/). O CV compila com `lualatex` (pdflatex frequentemente falha em instalações modernas do MiKTeX com erros de expansão de fonte do `fontawesome5`); a carta de apresentação compila com `xelatex` porque `cover.cls` requer `fontspec`. Se usar uma instalação mínima do TeX como TinyTeX ou BasicTeX, instale os pacotes extras listados em [SETUP.md](SETUP.md#minimal-tex-install-tinytexbasictex).
- Opcional: `pip install pypdf` para a verificação de parseabilidade ATS do `/apply` (BSD; não requer Poppler). O `pdftotext` do Poppler continua como fallback (macOS: `brew install poppler`, Debian/Ubuntu: `apt install poppler-utils`, Windows: `choco install poppler`). Se ambos estiverem ausentes, a verificação degrada para uma revisão visual de palavras-chave.

## Início rápido

> 🎥 **Prefere ver na prática primeiro?** [The Next New Thing fez um walkthrough prático](https://www.youtube.com/watch?v=HoVxjMNFYv4) de como o fluxo é realmente usado, do setup até uma candidatura finalizada (gravado em agosto de 2026 — os comandos podem ter evoluído desde então).

### Interface local de vagas

Com Bun e npm disponíveis, inicie a interface em `http://127.0.0.1:8080`:

```bash
npm run dev
```

Outros comandos:

```bash
npm run refresh          # atualiza as vagas de Psicologia e RH
npm run dev:fresh        # atualiza e depois inicia a interface
npm run refresh:offline  # reconstrói a interface usando os resultados locais
```

### 1. Fork e clone

```bash
gh repo fork MadsLorentzen/ai-job-search --clone
cd ai-job-search
```

> [!IMPORTANT]
> **Um fork deste repositório é sempre público** — o GitHub não permite forks privados de
> repositórios públicos — e o `/setup` (passo 3 abaixo) grava seus dados pessoais (nome,
> contato, histórico profissional, expectativas salariais) em arquivos **rastreados**.
> Se esta cópia é para sua própria busca de emprego e não para contribuir com mudanças,
> use um **repositório privado** com este repo como `upstream` — a receita de dois minutos
> está na [seção 8 do SETUP.md](SETUP.md#8-pulling-upstream-updates-into-your-fork),
> e todo fluxo de atualização funciona de forma idêntica. Faça fork apenas para contribuir.

### 2. Instalar ferramentas de busca de emprego

PowerShell:

```powershell
$tools = @("jobbank-search", "jobdanmark-search", "jobindex-search", "jobnet-search", "linkedin-search", "freehire-search")
foreach ($tool in $tools) {
  Push-Location ".agents/skills/$tool/cli"
  bun install
  Pop-Location
}
```

Bash / zsh / Git Bash:

```bash
for tool in jobbank-search jobdanmark-search jobindex-search jobnet-search linkedin-search freehire-search; do
  (cd .agents/skills/$tool/cli && bun install)
done
```

Para `linkedin-search` e `freehire-search`, a instalação é opcional: ambas têm zero dependências de runtime e rodam com `bun` puro; `bun install` só puxa tipos TypeScript de desenvolvimento.

### 3. Configurar seu perfil

```bash
claude
# Depois, dentro do Claude Code:
/setup
```

O `/setup` oferece três caminhos: ler sua pasta `documents/` se você já a tiver preenchida (PDF do CV, exportação do LinkedIn, diplomas, cartas de referência, candidaturas anteriores), importar um único CV colado no chat ou passar por uma entrevista. Ele detecta automaticamente o que você tem e pergunta. O modo pasta `documents/` é idempotente e seguro para reexecutar conforme você adiciona mais material; veja `documents/README.md` para a estrutura.

### 4. Buscar vagas

```bash
/scrape
```

Isso busca em vários portais de emprego posições compatíveis com seu perfil, deduplica resultados e apresenta tudo ordenado por fit. Escolha um match para rodar `/apply` diretamente — ou, quando um scrape retornar mais vagas do que você quer analisar manualmente, rode `/rank` para pontuar todas em lote contra o framework de fit e obter uma shortlist ranqueada primeiro.

### 5. Candidatar-se a uma vaga

```bash
/apply https://jobindex.dk/job/1234567
```

Se a URL não puder ser obtida (alguns portais bloqueiam acesso automatizado), você pode colar a descrição da vaga diretamente:

```bash
/apply <cole aqui a descrição completa da vaga>
```

Isso executa o fluxo completo: avaliar fit, rascunhar CV + carta de apresentação, revisar com um segundo agente, revisar e apresentar o resultado final.

As vagas são tratadas como entrada não confiável (o fluxo não segue instruções embutidas nelas e não busca links do corpo do texto), mas defesas agênticas são em nível de instrução, não em sandbox — em um portal desconhecido, revise o que foi obtido e escrito antes de enviar. Detalhes em [SECURITY.md](SECURITY.md).

## Outros comandos

`/setup`, `/scrape` e `/apply` formam o fluxo principal. Mais dez comandos o estendem depois que seu perfil está pronto:

- **`/interview`** prepara você para uma entrevista agendada em uma candidatura rastreada. Ele monta um pacote de preparação específico por etapa a partir do arquivo da candidatura (a vaga exata, o CV e a carta que o entrevistador realmente leu, feedback registrado de rodadas anteriores), pesquisa a empresa e os entrevistadores com regra de verificar antes de usar, mapeia perguntas prováveis aos seus exemplos STAR e oferece uma entrevista simulada seguindo o protocolo de roleplay em `07-interview-prep.md`. Lacunas recebem respostas-ponte honestas, nunca experiência inventada.
- **`/outcome`** registra o que aconteceu com uma candidatura — etapas de entrevista, ofertas, rejeições, silêncio. Arquiva o CV enviado, a carta de apresentação e o texto da vaga em `documents/applications/<company>_<role>/`, mantém `outcome.md` no formato que o Path A do `/setup` analisa e atualiza o tracker. Também cobre o stretch antes de haver um resultado para registrar: `/outcome followup` mostra candidaturas abertas que ficaram em silêncio (padrão: 10 dias), rascunha um follow-up curto e adequado ao canal no seu estilo de escrita usando apenas afirmações dos materiais que você já enviou (apenas rascunhos, nunca envia; no máximo duas vezes por candidatura) e oferece uma nota de agradecimento na mesma rodada em que uma etapa de entrevista é registrada. Depois que algumas candidaturas se resolvem, aponta de volta ao `/setup` para calibrar o framework de fit com o que de fato gerou entrevistas.
- **`/notion-sync`** publica uma visão unidirecional e somente leitura do pipeline em um banco de dados Notion via o servidor MCP oficial do Notion (OAuth, sem chaves de API) — uma linha por vaga ranqueada mais cada candidatura rastreada, com uma página de briefing gravada uma vez por linha. Os arquivos do repo continuam sendo a fonte da verdade: nada sincroniza de volta, e documentos sincronizam apenas como nomes de arquivo. Complementa o `/html-report`: aquele é o dashboard offline profundo que você regenera na sua mesa; este é a visão ao vivo de qualquer lugar onde o Notion roda (desktop, web, celular).
- **`/gmail-sync`** lê seu Gmail (via conector Gmail) em busca de sinais de status nas candidaturas abertas — convites de entrevista, links de assessment, ofertas, rejeições — e propõe tudo em lote para você aprovar antes de qualquer escrita no tracker ou em `outcome.md`, citando o e-mail de origem em cada mudança proposta. Ofertas param antes de propor `hired`/`offer_declined`, pois isso é sua decisão; sinais conflitantes ou não correspondidos são sinalizados para uma passagem manual de `/outcome` em vez de adivinhar.
- **`/rank`** faz a ponte entre `/scrape` e `/apply`: pontua em lote todas as vagas recém-raspadas contra o framework de fit (agentes paralelos obtêm cada vaga e pontuam as cinco dimensões de avaliação) e retorna uma shortlist ranqueada com pontos fortes e lacunas honestas por vaga. Deal-breakers vetam, prazos recebem flags de urgência, vagas expiradas são marcadas como expiradas. Escolha um número e ele repassa ao fluxo completo do `/apply`.
- **`/expand`** enriquece seu perfil escaneando fontes públicas que você já vinculou nele (repos GitHub, site portfolio, Kaggle, Google Scholar) e buscando ementas de cursos e certificações nomeados. Competências descobertas são adicionadas ao perfil com tag de origem. Útil logo após o `/setup` para revelar habilidades que documentos sozinhos não deixam explícitas.
- **`/upskill`** analisa a lacuna entre seu perfil, suas vagas rastreadas e suas vagas ranqueadas mas não rastreadas (lacunas registradas do `/rank` em `seen_jobs.json`) — ou uma vaga única via `/upskill <URL>`. Produz um heatmap priorizado de lacunas de habilidade e um plano de estudo com recursos buscados na web e estimativas de tempo. Útil para planejamento de carreira entre candidaturas.
- **`/html-report`** gera um dashboard HTML autocontido a partir de `job_search_tracker.csv` e dos arquivos de candidaturas — cards de estatísticas, gráficos de status/setor/canal/funil (SVG inline, sem dependências externas) e uma tabela filtrável de candidaturas. Abre direto no navegador, totalmente offline. Reexecute a qualquer momento depois que `/apply` ou `/outcome` adicionarem novas entradas.
- **`/add-template`** registra seu próprio template de CV ou carta de apresentação (LaTeX, Typst ou outra toolchain) no lugar dos padrão. Captura as instruções do template (extensão de origem, comando de compilação, fontes, regras de estilo, limite de páginas), executa uma compilação de teste obrigatória e conecta o template ao `/apply`. Veja [Templates personalizados](#templates-personalizados) abaixo.
- **`/add-portal`** gera uma skill de busca em portal de emprego para um site do seu mercado. Investiga o portal (padrão de URL de busca, estrutura de resultados, regras de acesso), cria a skill CLI com a mesma estrutura das que já vêm no projeto e executa uma consulta ao vivo antes de registrar. Veja [Ferramentas de busca de emprego](#ferramentas-de-busca-de-emprego) abaixo.

O `/reset` também está disponível; veja [Começar do zero](#começar-do-zero) abaixo.

## Estrutura de arquivos

```
ai-job-search/
├── CLAUDE.md                          # Perfil principal do candidato + regras do fluxo
├── .claude/
│   ├── commands/
│   │   ├── apply.md                   # Fluxo /apply (drafter-reviewer)
│   │   ├── setup.md                   # Onboarding /setup (pasta documents, importação de CV ou entrevista)
│   │   ├── expand.md                  # /expand enriquecimento de competências a partir de documentos e presença online
│   │   ├── add-template.md            # /add-template registrar templates personalizados (LaTeX, Typst, ...)
│   │   ├── add-portal.md              # /add-portal gerar skill de busca em portal para seu mercado
│   │   ├── rank.md                    # /rank triagem de vagas raspadas em shortlist ranqueada
│   │   ├── outcome.md                 # /outcome registrar resultados de candidaturas, arquivar materiais
│   │   ├── gmail-sync.md              # /gmail-sync detectar status de candidaturas automaticamente via Gmail
│   │   ├── interview.md               # /interview pacote de preparação por etapa + entrevista simulada
│   │   ├── html-report.md             # /html-report gerar dashboard do tracker de candidaturas
│   │   ├── notion-sync.md             # /notion-sync visão unidirecional do pipeline em banco Notion
│   │   └── reset.md                   # /reset apagar dados de perfil ou pasta documents
│   ├── skills/
│   │   ├── job-application-assistant/  # Skill principal de candidatura
│   │   │   ├── SKILL.md               # Definição da skill
│   │   │   ├── 01-candidate-profile.md # Sua educação, experiência, habilidades
│   │   │   ├── 02-behavioral-profile.md# Avaliação PI/DISC/personalidade
│   │   │   ├── 03-writing-style.md    # Tom, estrutura, o que fazer e evitar
│   │   │   ├── 04-job-evaluation.md   # Framework de pontuação de fit da vaga
│   │   │   ├── 05-cv-templates.md     # Estrutura LaTeX do CV + regras de personalização
│   │   │   ├── 06-cover-letter-templates.md # Templates LaTeX de carta de apresentação
│   │   │   └── 07-interview-prep.md   # Exemplos STAR + framework de entrevista
│   │   ├── job-scraper/               # Orquestração de busca de emprego
│   │   └── upskill/                   # /upskill análise de lacunas de habilidade e plano de estudo
│   └── settings.json                  # Permissões do Claude Code (compartilhadas, com escopo)
├── .agents/skills/                    # Ferramentas CLI de portais de emprego
│   ├── jobbank-search/                # Akademikernes Jobbank (Dinamarca)
│   ├── jobdanmark-search/             # Jobdanmark.dk (Dinamarca)
│   ├── jobindex-search/               # Jobindex.dk (Dinamarca)
│   ├── jobnet-search/                 # Jobnet.dk (Dinamarca, portal governamental)
│   ├── linkedin-search/               # Vagas públicas do LinkedIn (agnóstico de país)
│   └── freehire-search/               # Agregador freehire.me de vagas tech (multi-mercado, REST API)
├── cv/
│   └── main_example.tex               # Template LaTeX moderncv
├── cover_letters/
│   ├── cover.cls                      # Classe LaTeX personalizada de carta de apresentação
│   ├── cover_example.tex              # Exemplo de carta (referência estrutural + smoke test de CI)
│   └── OpenFonts/                     # Fontes Lato + Raleway
├── templates/                         # Templates personalizados registrados via /add-template
│   └── README.md                      # Instruções de estrutura da pasta
├── documents/                         # Materiais de carreira para Path A do /setup e /expand
│   ├── README.md                      # Instruções de estrutura da pasta
│   ├── cv/                            # CV mestre (PDF ou .tex)
│   ├── linkedin/                      # Exportação do perfil LinkedIn (PDF)
│   ├── diplomas/                      # Diplomas e históricos escolares
│   ├── references/                    # Cartas de referência
│   └── applications/                  # Registros de candidaturas anteriores (<company>_<role>/)
├── .github/workflows/ci.yml           # CI: smoke compiles LaTeX, lint de skills, typechecks CLI
├── salary_lookup.py                   # Ferramenta de benchmarking salarial (traga seus dados)
├── tools/
│   ├── check_framework_version.py     # Checagem CI: framework_version incrementado quando skills mudam
│   ├── check_upstream_updates.py      # Pré-visualizar quais arquivos personalizados uma atualização upstream toca
│   ├── convert_salary_excel.py        # Converter Excel salarial para JSON
│   ├── lint_skills.py                 # Lint CI para skills, commands, settings.json
│   ├── robots_check.py                # Gate do retry com browser-header contra robots.txt
│   ├── security_guards.py             # Guards CI: allowlist de permissões, regras gitignore, manifests
│   ├── upstream_triage.py             # Classificar commits upstream em vale-revisar vs provavelmente-pular
│   ├── verify_pdf.py                  # Verificar contagem de páginas e texto extraível de PDF compilado
│   └── README_SALARY_TOOL.md          # Instruções de setup da ferramenta salarial
├── job_scraper/                       # Estado do scraper (vagas vistas, resultados)
├── gmail_sync/                        # Estado do /gmail-sync (IDs de mensagens processadas, última sync)
├── upskill/                           # Saída de relatórios do /upskill (relatórios markdown por execução)
├── job_search_tracker.csv             # Planilha de rastreamento de candidaturas
└── SETUP.md                           # Guia detalhado de setup
```

## Como o `/apply` funciona

O comando `/apply` executa um **fluxo drafter-reviewer** com compilação obrigatória de PDF:

1. **Analisar** a vaga (URL ou texto)
2. **Avaliar fit** contra seu perfil (habilidades, experiência, cultura, localização, alinhamento de carreira)
3. **Rascunhar** um CV e uma carta de apresentação personalizados em LaTeX
4. **Disparar um agente revisor** que pesquisa a empresa e critica os rascunhos
5. **Revisar** com base no feedback do revisor
6. **Compilar e inspecionar** ambos os PDFs: lualatex para o CV, xelatex para a carta. O Claude lê as páginas renderizadas e itera no LaTeX até o CV ter exatamente 2 páginas sem títulos de entrada órfãos, e a carta ter exatamente 1 página com assinatura visível e fontes consistentes.
7. **Verificar ATS do CV**: extrair a camada de texto do PDF (`pdftotext`, dependência opcional) e verificar como um parser ATS vê — detalhes de contato como texto literal, sem glifos corrompidos, ordem de leitura coerente — depois pontuar a cobertura de palavras-chave da vaga contra a extração. Palavras-chave que o perfil genuinamente suporta são adicionadas; lacunas reais permanecem visíveis, nunca preenchidas artificialmente.
8. **Apresentar** o resultado final com checklist de verificação

Todas as afirmações no CV e na carta são verificadas contra seu perfil real. O sistema nunca inventa habilidades ou experiência.

### O que torna este fluxo diferente

- **Loop de verificação de PDF.** A maioria dos templates LaTeX de currículo produz saída que "parece ok no .tex" mas quebra no PDF: títulos de cargo órfãos na página seguinte, cartas transbordando para a página 2, fontes de bullets voltando silenciosamente à fonte do corpo. O comando `/apply` compila e inspeciona visualmente cada PDF e aplica correções direcionadas (`\needspace`, `\enlargethispage`, wrappers de fonte para itens de lista) até o layout ficar limpo. Isso roda automaticamente em cada candidatura.
- **Verificação ATS na camada de texto do PDF.** Um ATS lê o texto embutido do PDF, não a página renderizada — e o LaTeX pode produzir silenciosamente PDFs cujo texto extrai como lixo (glifos de ícone onde deveria estar o e-mail, linhas entrelaçadas de layouts multi-coluna). O `/apply` extrai a camada de texto do CV compilado com `pdftotext` e verifica detalhes de contato, ordem de leitura e cobertura de palavras-chave da vaga contra o que um parser realmente vê. Regra de honestidade aplicada: uma palavra-chave que o perfil não suporta é reconhecida como lacuna, nunca inserida artificialmente.
- **Corte de CV ponderado por relevância.** Quando um CV transborda 2 páginas, o fluxo não corta mecanicamente da seção "mais antiga". Ele pontua cada linha candidata por (a) relevância para a vaga alvo, (b) unicidade no documento e (c) se a carta de apresentação depende dela, e corta primeiro a linha com menor pontuação total. Um bullet de cargo mais antigo que acerta palavras-chave da vaga sobrevive antes de um bullet recente que não acerta.
- **Separação drafter-reviewer.** O drafter escreve; um segundo agente Claude, disparado com contexto fresco, pesquisa a empresa e critica os rascunhos. O drafter então revisa. Isso captura palavras-chave perdidas, enquadramento fraco e linguagem genérica que uma passagem única frequentemente deixa.
- **Dispatch eficiente em tokens para o revisor.** O agente revisor recebe rascunhos inline em vez de relê-los, e o checklist de verificação roda uma vez no final do fluxo em vez de ser duplicado por ambos os agentes. Nota: o novo passo de compilar-e-inspecionar no Passo 5 gasta parte dessa economia em renderização de PDF e iteração de layout — o fluxo troca parte do custo total de tokens por uma redução real de PDFs quebrados chegando ao usuário.

## Personalização

### Quais arquivos editar manualmente

Se preferir editar arquivos diretamente em vez de usar `/setup`:

| Arquivo | O que alterar |
|------|---------------|
| `CLAUDE.md` | Seu perfil completo (nome, educação, experiência, habilidades, objetivos) |
| `01-candidate-profile.md` | Versão estruturada dos dados do seu CV |
| `02-behavioral-profile.md` | Sua avaliação comportamental ou autoavaliação |
| `04-job-evaluation.md` | Áreas de match de habilidades, objetivos de carreira, filtros de motivação |
| `05-cv-templates.md` | Templates de statement de perfil para diferentes tipos de cargo |
| `07-interview-prep.md` | Seus exemplos STAR de experiência real |
| `search-queries.md` | Consultas de busca de emprego para suas habilidades e localização |

### Atualizar suas consultas de busca

Conforme suas prioridades evoluem, você pode reconfigurar apenas a busca de emprego sem refazer todo o setup de perfil:

```
/setup --section search
```

Isso refaz a entrevista de configuração de busca: quais cargos mirar, quais habilidades buscar, quais localizações e quais portais. Também sugere tipos de cargo que você talvez não tenha considerado com base no seu perfil.

### Templates personalizados

O CV usa [moderncv](https://ctan.org/pkg/moderncv) (estilo banking). A carta de apresentação usa um `cover.cls` personalizado com fontes Lato/Raleway. Ambos são LaTeX — o engine de referência que este repo entrega e mantém.

Para usar seu próprio template — LaTeX, [Typst](https://typst.app/) ou qualquer outra toolchain que compile para PDF pela linha de comando — execute:

```
/add-template
```

Aponte para seu arquivo de origem (um `.tex` mais quaisquer `.cls`/`.sty` ou fontes incluídas; um `.typ` mais pacotes locais; ou equivalente para outra toolchain). O comando entrevista você sobre as instruções do template — extensão de origem, comando de compilação, fontes e onde ficam, regras de estilo a preservar, limite rígido de páginas — armazena tudo em `templates/`, executa uma compilação de teste obrigatória e ativa o template para o `/apply` rascunhar e compilar a partir dele. Templates são armazenados com tokens `[PLACEHOLDER]` em vez de dados pessoais, então são seguros para commit e compartilhamento.

- `/add-template --list` mostra templates registrados
- `/add-template --use <name>` alterna entre eles
- `/add-template --use default` reverte aos templates padrão moderncv / cover.cls

Se preferir fazer manualmente, a rota manual ainda funciona: atualize a orientação em `05-cv-templates.md` e `06-cover-letter-templates.md`.

### Ferramentas de busca de emprego

As quatro ferramentas CLI dinamarquesas em `.agents/skills/` (Jobbank, Jobdanmark, Jobindex, Jobnet) demonstram o padrão para construir uma integração de portal de emprego para um mercado específico. Se você está em outro país, execute:

```
/add-portal
```

Informe a URL do site de emprego local. O comando investiga o portal (padrão de URL de busca, estrutura da página de resultados, robots.txt/regras de acesso), cria uma skill CLI com a mesma estrutura, comandos e contrato de saída das que já vêm no projeto e executa uma consulta ao vivo antes de registrar qualquer coisa. Portais com autenticação são recusados, e portais com termos restritivos recebem um aviso proeminente de uso pessoal apenas na skill gerada. A skill gerada é específica de mercado e vive no seu fork; o gerador em si é a parte universal.

Mantendo um fork adaptado ao seu mercado ou idioma? Adicione-o à thread [Community forks & adaptations](https://github.com/MadsLorentzen/ai-job-search/discussions/78) para que outros possam encontrá-lo.

Para **pontos de partida agnósticos de país** fora da Dinamarca, o repo inclui duas skills de portal junto com as demos dinamarquesas:

- **`linkedin-search`** — construída sobre os endpoints públicos e não autenticados `jobs-guest` do LinkedIn. Agnóstica de área, **zero dependências de runtime** (roda só com `bun`) e recebe a localização de busca como flag explícita, funcionando para qualquer mercado de imediato (`-l "Berlin, Germany"`, `-l "Mumbai, Maharashtra, India"`, `-l "Remote"`, …). Destinada a **uso pessoal apenas** — acesso automatizado viola os Termos de Serviço do LinkedIn, então mantenha o volume baixo. Veja `.agents/skills/linkedin-search/SKILL.md`.
- **`freehire-search`** — consulta a API REST pública do agregador [freehire.me](https://freehire.me) (JSON, sem chave de API). Focada em tech (software, dados, engenharia, DevOps, remoto), multi-mercado via flags de faceta (`--region`, `--country`, `--remote`) e **zero dependências de runtime**. Diferente dos portais dinamarqueses que fazem scraping HTML, os resultados vêm estruturados (habilidades, senioridade, categoria). O backend é MIT-licensed e [auto-hospedável](https://github.com/strelov1/freehire) — aponte `FREEHIRE_API_URL` para sua própria instância se preferir. Veja `.agents/skills/freehire-search/SKILL.md`.

### Estendendo o framework: portais, templates, critérios — e emprestando de outros forks

Tudo acima soma um modelo de extensão, então aqui está declarado de forma direta. O framework tem três pontos de extensão, e nenhum exige tocar no upstream:

1. **Skills de portal** — o sistema de módulos para sites de emprego. Cada skill `*-search` é uma pasta autocontida em `.agents/skills/` com o mesmo contrato (CLI `search`/`detail`, saída `--format json|table|plain`, flag `enabled:` em seu `SKILL.md`, testes próprios). O `/scrape` descobre automaticamente qualquer skill instalada que siga o contrato — nada para registrar, nada para conectar. O `/add-portal` gera novas; o [índice comunitário de portais](https://github.com/MadsLorentzen/ai-job-search/discussions/78) cataloga as que outros forks construíram.
2. **Templates de documento** — o `/add-template` registra qualquer toolchain de CV ou carta de apresentação que compile para PDF pela linha de comando, LaTeX ou não.
3. **Critérios de avaliação** — deal-breakers e preferências no seu perfil são livres, e a rubrica de avaliação pontua contra o que você colocar lá. "Termos fortes de licença parental", "salário mínimo X conforme escala do meu sindicato", "sem plantão" — cada um é uma linha de perfil, sem código, e tem peso real nas avaliações de fit do `/rank` e `/apply`. Idioma é o único tipo de deal-breaker com tratamento dedicado e estruturado: o `/setup` captura cada idioma em que você trabalha e seu nível (perguntado diretamente ou inferido do seu CV/exportação LinkedIn) em uma tabela `Languages`, e o Language Gate (`04-job-evaluation.md`) rejeita duramente uma vaga que exige um idioma que você não declarou, enquanto sinaliza — sem auto-rejeitar — uma que pede nível mais alto que o declarado em um idioma que você de fato usa, para que um caso limítrofe (uma barra rígida de "fluente" contra seu B1/B2, por exemplo) receba seu julgamento em vez de um descarte silencioso.

**Emprestar uma skill de portal de outro fork** é a forma prevista de obter um site que o upstream não entrega: encontre no [índice de portais](https://github.com/MadsLorentzen/ai-job-search/discussions/78), abra aquele fork e copie a pasta para seu próprio `.agents/skills/`. Antes de executar:

- **Leia o código.** Todo ele — essas CLIs rodam pré-aprovadas na sua máquina (`.claude/settings.json` as coloca na allowlist) contra seus dados de carreira. Verifique que as únicas chamadas de rede vão para o site de emprego que ela diz buscar, que `package.json` não tem `dependencies` nem scripts de lifecycle (`postinstall` etc.) e que nada lê ou escreve fora da própria pasta.
- **Execute os testes offline** (`bun test` no diretório `cli/` da skill) — uma skill bem construída passa nos testes sem acesso à rede.
- Verifique a flag `enabled:` e as notas de ToS da própria skill.

A etapa de cópia é manual de propósito. Suas configurações já permitem que skills de portal instaladas rodem sem perguntar toda vez — então um instalador que as buscasse de repos de terceiros pularia a única checagem que importa: você, lendo o código primeiro. Não existe um, e isso é uma decisão de segurança, não uma funcionalidade faltando.

*Fontes de dados* específicas de mercado (base salarial nacional, tabelas locais de convenção coletiva) seguem o mesmo padrão dos portais: pertencem a um fork de mercado, compartilhadas via [#78](https://github.com/MadsLorentzen/ai-job-search/discussions/78), não no upstream.

### Benchmarking salarial

A ferramenta salarial funciona com quaisquer dados salariais que você fornecer (estatísticas sindicais, exportações Glassdoor, pesquisa pessoal, etc.). Veja `tools/README_SALARY_TOOL.md` para o formato esperado e setup. Se você não tiver dados salariais, a etapa salarial é simplesmente ignorada.

### Começar do zero

Para apagar seus dados de perfil e recomeçar:

```
/reset profile    # limpa arquivos de skill, preserva regras do framework
/reset documents  # apaga arquivos da pasta documents/
/reset all        # ambos
```

O `/reset` mostra exatamente o que será apagado e exige que você digite `RESET` para confirmar. Nada é apagado até você fazer isso.

### Manter-se atualizado

O upstream evolui rápido. Em vez de puxar `master` cru e torcer, atualize seu fork para uma [release](../../releases) com tag — um checkpoint validado descrito no [CHANGELOG.md](CHANGELOG.md). `python3 tools/check_upstream_updates.py` pré-visualiza exatamente quais dos seus arquivos personalizados uma atualização toca antes de você fazer merge, e `python3 tools/upstream_triage.py` classifica os commits que você está atrás em "vale revisar" vs "provavelmente pular" (um fluxo semanal pode postar isso em uma issue contínua). Walkthrough completo em [SETUP.md, seção 8](SETUP.md#8-pulling-upstream-updates-into-your-fork).

## Dicas para melhores resultados

### A profundidade do perfil importa

O fator mais importante na qualidade da saída é quanto detalhe você coloca no perfil. Um perfil raso produz candidaturas genéricas; um detalhado permite resultados genuinamente personalizados.

- **Descrições de cargo:** Não liste apenas títulos. Descreva o que você realmente fez em cada posição: projetos específicos, ferramentas usadas, responsabilidades e conquistas mensuráveis. Quanto mais material você fornecer, mais precisamente o sistema pode reenquadrar sua experiência para diferentes cargos.
- **Habilidades em contexto:** Em vez de listar "Python" ou "gestão de projetos", descreva como e onde aplicou. "Construí pipelines de ML para predição de churn de clientes em Python usando scikit-learn" dá ao sistema muito mais material do que "Python, machine learning".
- **Todos os caminhos de onboarding funcionam:** Seja apontando o `/setup` para sua pasta `documents/`, colando um único CV ou passando pela entrevista, o princípio é o mesmo: entrada mais rica produz saída mais precisa.

### Descoberta de trilha de carreira

O framework suporta dois modos distintos de busca de emprego:

- **Direcionamento explícito:** Você sabe quais cargos ou setores quer. O sistema ajuda a refinar e priorizar com base no fit.
- **Descoberta de oportunidades latentes:** Analisando seu histórico completo (não só títulos, mas o trabalho real que fez), o sistema pode revelar trilhas de carreira que você não considerou. Habilidades transferíveis que mapeiam para indústrias inesperadas, padrões no que você gostou ou se destacou, ou cargos emergentes que combinam sua expertise de domínio com nova tecnologia.

Para aproveitar ao máximo, invista tempo durante o `/setup` descrevendo não só sua experiência, mas o que te energizou, o que te drenou e o que você queria ter mais. Esse contexto molda diretamente como o sistema avalia fit e quais cargos ele revela durante o `/scrape`.

## Contribuindo

Pensando em um PR? Leia [CONTRIBUTING.md](CONTRIBUTING.md) primeiro — explica o que é mergeado, o que fica em forks e por quê.

## Agradecimentos

- [Mikkel Krogholm](https://github.com/mikkelkrogsholm) ([repositório de skills](https://github.com/mikkelkrogsholm/skills)) pelas skills CLI de busca de emprego
- Construído com [Claude Code](https://claude.com/claude-code) pela [Anthropic](https://anthropic.com)

## Licença

MIT
