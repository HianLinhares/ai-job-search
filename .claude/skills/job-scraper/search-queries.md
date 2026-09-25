# Search Queries for Job Scraper — Psicologia e RH remoto no Brasil

<!-- Escopo fixo: oportunidades REMOTAS com elegibilidade no Brasil. -->

## Configuração de mercado

| Parâmetro | Valor |
|-----------|-------|
| **País** | Brasil |
| **Modalidade** | Somente remoto (híbrido/presencial fora do escopo) |
| **Idiomas das queries** | Português (BR) e aliases profissionais em inglês |
| **Recência para vagas/projetos** | Últimos 14 dias |
| **Recência para credenciamentos** | Página ou formulário ativo, sem limite de publicação |

**Regras obrigatórias em todo `/scrape`:**
1. Separar os resultados em `vaga`, `credenciamento_clinico` e `projeto_autonomo`.
2. Descartar oportunidades presenciais, híbridas, encerradas ou sem elegibilidade no Brasil.
3. Não tratar diretório profissional, cadastro de prestador ou marketplace como vínculo empregatício.
4. Portais dinamarqueses e portais exclusivamente tech permanecem `enabled: false`.

## Installed portal CLIs

| Skill | Uso | Flags padrão |
|-------|-----|---------------|
| `linkedin-search` | Vagas de Psicologia e RH | `-l "Brazil" --remote remote` |
| `gupy-search` | Vagas corporativas, saúde e RH | `--remote remote` |
| `remotar-search` | Vagas remotas agregadas no Brasil | filtro remoto nativo; aplicar elegibilidade BR client-side |

### Exemplos CLI

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts search \
  -l "Brazil" --remote remote -q "psicólogo" --jobage 14 --limit 20 --format json

bun run .agents/skills/gupy-search/cli/src/cli.ts search \
  -q "talent acquisition" --remote remote --jobage 14 --limit 20 --format json

bun run .agents/skills/remotar-search/cli/src/cli.ts search \
  -q "recursos humanos" --jobage 14 --limit 20 --format json
```

Use exatamente os flags documentados no `SKILL.md` de cada portal. LinkedIn deve usar
`"Brazil"` como localização principal, nunca uma cidade, junto de `--remote remote`.

## Tipos e prioridades

### Priority 1: Psicoterapia e saúde mental online

**Tipo principal:** `vaga` ou `credenciamento_clinico`, conforme a página.

Termos CLI:
- `psicólogo`, `psicóloga`, `psicólogo clínico`, `psicoterapia online`
- `psicólogo infantil`, `psicólogo infantojuvenil`, `psicólogo adolescente`
- `psicólogo adulto`, `psicogerontologia`, `psicólogo terceira idade`, `psicólogo 60+`
- `saúde mental`, `telepsicologia`, `teleatendimento psicológico`

Públicos-alvo a confirmar na descrição:
- crianças de 4 a 12 anos;
- adolescentes e adultos;
- pessoas idosas (60+).

### Priority 2: Recrutamento, Talent Acquisition e HRBP

**Tipo:** `vaga`.

Termos CLI:
- `recrutador sênior`, `recruiter senior`, `talent acquisition`, `talent partner`
- `HR business partner`, `HRBP`, `people business partner`, `people partner`
- `recrutamento e seleção`, `analista de R&S`, `consultor de R&S`
- `seleção por competências`, `entrevista por competência`

### Priority 3: Assessment, avaliação psicológica e laudos

**Tipo:** `vaga` ou `projeto_autonomo`.

Termos CLI:
- `avaliação psicológica`, `assessment psicológico`, `testes psicológicos`
- `aplicação de testes`, `interpretação de testes`, `laudo psicológico`
- `avaliação psicossocial`, `avaliação comportamental`

Não apresentar como executável remotamente sem confirmar que os instrumentos usados têm
parecer favorável no SATEPSI e aplicação explicitamente autorizada como `On line (remoto)`.

### Priority 4: EAP, saúde ocupacional e benefícios

**Tipo:** `vaga` ou `credenciamento_clinico`.

Termos CLI:
- `EAP`, `employee assistance program`, `programa de apoio ao empregado`
- `assistência ao empregado`, `orientação psicológica`, `acolhimento psicológico`
- `saúde ocupacional`, `saúde corporativa`, `bem-estar corporativo`
- `benefícios corporativos`, `gestão de saúde`, `operadora de saúde`

### Priority 5: Treinamento, desenvolvimento e consultoria de RH

**Tipo:** `vaga` ou `projeto_autonomo`.

Termos CLI:
- `treinamento e desenvolvimento`, `T&D`, `learning and development`, `L&D`
- `facilitador soft skills`, `instrutor soft skills`, `educação corporativa`
- `saúde mental corporativa`, `treinamento entrevista por competência`
- `consultor de RH`, `consultoria de RH`, `consultor de pessoas`

### Priority 6: Projetos autônomos e captação de clientes

**Tipo:** `projeto_autonomo`; sempre exibir separadamente e em baixa prioridade.

Fontes: Workana, 99Freelas, GetNinjas e Cronoshare.

Termos:
- `psicólogo online`, `psicoterapia online`, `consultoria de RH`
- `recrutamento e seleção`, `treinamento corporativo`, `avaliação psicológica`

## Fontes sem CLI

### Vagas — WebSearch

Estas fontes podem ser consultadas por WebSearch, sem criar scraper que burle login,
robots.txt ou termos de uso:

- Indeed, Vagas.com.br, Catho, InfoJobs, Jobbol, Empregare e Trampos;
- páginas de carreira da Sólides;
- Hays, Robert Half e Michael Page;
- páginas próprias de clínicas, consultorias de RH, empresas de EAP, saúde ocupacional,
  operadoras de saúde e benefícios corporativos.

Modelos de query (combinar cada domínio com os termos das prioridades):

```text
site:br.indeed.com psicólogo remoto Brasil
site:vagas.com.br "talent acquisition" remoto
site:catho.com.br HRBP remoto Brasil
site:infojobs.com.br "recrutamento e seleção" remoto
site:jobbol.com.br psicólogo remoto
site:empregare.com "recursos humanos" remoto
site:trampos.co psicólogo OR HRBP remoto
site:solides.com.br/vagas "talent acquisition" remoto
site:hays.com.br recrutamento OR HRBP remoto
site:roberthalf.com.br "recursos humanos" remoto
site:michaelpage.com.br HRBP OR "talent acquisition" remoto
("clínica de psicologia" OR EAP OR "saúde ocupacional" OR "benefícios corporativos") psicólogo remoto Brasil
```

Indeed é apenas fonte de descoberta: validar a vaga na página da empresa antes de salvar.
Glassdoor não é uma fonte independente desta estratégia.

### Redes clínicas e credenciamento — WebSearch

Buscar páginas oficiais de cadastro de profissionais em:
- Conexa, usando também `Psicologia Viva` e `Zenklub` apenas como aliases legados;
- Vittude, Telavita, Psitto, OrienteMe e Guia da Alma;
- Doctoralia, classificada como diretório/captação, não vaga.

Modelos de query:

```text
site:conexasaude.com.br psicólogo "venha fazer parte" OR profissionais
site:vittude.com psicólogo credenciamento OR "seja um profissional"
site:telavita.com.br psicólogo cadastro OR credenciamento
site:psitto.com.br psicólogo cadastro
site:orienteme.com.br psicólogo "trabalhe conosco" OR credenciamento
site:guiadaalma.com.br psicólogo especialista OR credenciamento
site:doctoralia.com.br psicólogo cadastrar perfil
```

Para credenciamentos, confirmar que o formulário está ativo, o modelo de contratação,
exigência de PJ/CNPJ, remuneração/comissão e público atendido. Não aplicar filtro de 14 dias.

### Projetos autônomos — WebSearch

```text
site:workana.com psicólogo OR "consultoria de RH" Brasil
site:99freelas.com.br psicólogo OR recrutamento OR treinamento
site:getninjas.com.br psicólogo online
site:cronoshare.com.br psicólogo online
```

Validar escopo, orçamento, data, possibilidade remota e aderência ética antes de salvar.

## Fontes excluídas ou consolidadas

- `Programathor`, `Hipsters Jobs`, `GeekHunter`, `RemoteOK`, `Himalayas`,
  `We Work Remotely`, `Wellfound` e `Freehire`: foco tech incompatível com esta busca.
- `Kenoby`: marca/plataforma incorporada pela Gupy; buscar na Gupy.
- `Tangerino`: marca incorporada pela Sólides; buscar na Sólides.
- `Psicologia Viva` e `Zenklub`: aliases de descoberta; consolidar o resultado em Conexa.
- `Psytech`: software de gestão clínica, não portal de oportunidades.
- `Conectere`: fonte não identificada com segurança; não consultar sem URL verificável.
- `Cadastro e-Psi`: deixou de ser exigido em 31/08/2024 e nunca foi portal de vagas.
- Grupos de WhatsApp/Telegram/LinkedIn e BNI: canais manuais de networking; não automatizar.

## Filtros

### Localização

**PASS:** remoto/home office com elegibilidade explícita no Brasil.
**FAIL:** presencial, híbrido, remoto restrito a outro país ou realocação obrigatória.
**FLAG:** anúncio diz remoto, mas exige presença frequente ou não confirma elegibilidade BR.

### Situação e data

- Vaga/projeto: publicado nos últimos 14 dias e ainda aberto.
- Credenciamento: formulário oficial acessível e aceitando profissionais.
- Sem data: manter apenas se a página estiver ativa e marcar `data desconhecida`.

### Idioma

Aplicar o Language Gate de `04-job-evaluation.md` e a tabela Languages em `CLAUDE.md`.

### Conformidade profissional

- Atendimento psicológico por TDICs exige inscrição ativa no CRP e observância da
  Resolução CFP nº 09/2024; cadastro e-Psi não é mais exigido.
- Avaliação psicológica segue a Resolução CFP nº 31/2022.
- Testes devem estar favoráveis no SATEPSI e o manual precisa autorizar a modalidade
  online/remota; aplicação informatizada não equivale automaticamente a aplicação remota.
- Tratar exigência de especialização, experiência por faixa etária, PJ/CNPJ e seguro
  profissional como requisitos a confirmar, nunca presumir.

## Adapting Queries

- `/scrape psicoterapia` → Prioridade 1.
- `/scrape infantil` → Prioridade 1, termos infantil/infantojuvenil/4–12.
- `/scrape rh` → Prioridades 2 e 5.
- `/scrape assessment` → Prioridade 3.
- `/scrape eap` → Prioridade 4.
- `/scrape freelance` → Prioridade 6.
- `/scrape broad` → todas as prioridades e tipos.
- Nunca remover os filtros remoto/BR sem solicitação explícita.
