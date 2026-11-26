# Changelog

## v1.3.0

### Novidades

- **Estilo Origami** nas duas cartas ([hazymorning/origami](https://github.com/hazymorning/origami)):
  - letra Montserrat, cantos a 35% da altura de cada controlo e as sombras dos cartões da Origami;
  - o estado num **chip com ponto de cor** (azul a lavar, laranja a secar, verde no fim);
  - a fase e a caixa de informação em **painéis desfocados**, como os cartões da Origami;
  - os ícones de estado e os botões **Desligar / Parar** em quadrados de cantos arredondados;
  - no cartão de programas, os programas como **mosaicos da Origami**, preenchidos com a cor ativa quando escolhidos, e a pesquisa e a confirmação no mesmo estilo.
- Com o **tema Origami** ativo, as cartas usam as cores, a letra e os cantos do tema, em claro e em escuro. Sem ele, usam os tons escuros da Origami.
- A cor de destaque por omissão passa a ser o **azul do tema** (como na Origami). Quem tem `colour` definido mantém a sua.
- O desenho da máquina e o visor Dot Matrix não mudam.
- Imagem nova no README, em modo escuro e com o tema Origami claro.

### Letra
A Montserrat só aparece se estiver carregada no Home Assistant (como pede a Origami). Sem ela, as cartas usam a letra do sistema.

### Depois de atualizar

Recarregue o browser (Ctrl/Cmd + Shift + R). Na app do telemóvel: **Definições da app → Depuração → Limpar cache do frontend**.

## v1.2.1

### Correções

- **Ícones maiores nos botões Desligar e Parar:** o símbolo passa a ocupar cerca de 70% do círculo, em vez de ficar minúsculo no centro.
- **Ícones de estado maiores** (controlo remoto, porta, sal e abrilhantador), pela mesma razão.

O tamanho estava em percentagem, que o ícone do Home Assistant não aplicava, e por isso ficava num tamanho mínimo. Agora acompanha a largura da carta.

### Depois de atualizar

Recarregue o browser (Ctrl/Cmd + Shift + R). Na app do telemóvel: **Definições da app → Depuração → Limpar cache do frontend**.

## v1.2.0

### Novidades

- **Botões Parar e Desligar na própria máquina:** passam a ser dois botões redondos com ícone, dos dois lados da pega e do visor (Desligar à esquerda, Parar à direita), em vez da linha de botões por cima da máquina.
  - **Desligar** aparece com a máquina ligada; **Parar** só com um ciclo a correr.
  - Só aparecem com o controlo remoto ligado na máquina, como antes.
  - Continuam a pedir confirmação antes de enviar o comando.
- **Nova opção `buttons`:** `machine` (por omissão) ou `row`, para voltar aos botões em linha por cima da máquina. Também no editor visual, em **Botões Parar / Desligar**.

### Como usar

Não precisa de mudar nada: os botões passam para a máquina sozinhos. Para voltar ao estilo anterior:

```yaml
type: custom:hon-dishwasher-card
buttons: row
```

### Depois de atualizar

Recarregue o browser (Ctrl/Cmd + Shift + R). Na app do telemóvel: **Definições da app → Depuração → Limpar cache do frontend**.

## v1.1.2

### Novidades

- **Imagem da carta no README**, para se ver como fica antes de instalar (Haier XF 6C2M1PX a secar).
- **Instruções de instalação pelo HACS / Marketplace** no README.
- **Validação automática do HACS** no repositório, a preparar a entrada na lista oficial do Marketplace.

A carta em si não muda nesta versão.

### Depois de atualizar

Recarregue o browser (Ctrl/Cmd + Shift + R). Na app do telemóvel: **Definições da app → Depuração → Limpar cache do frontend**.

## v1.1.1

### Correções

- A opção de abertura da porta no fim do ciclo passa a aparecer como **"Abertura Automática"** (antes "Abertura auto") na linha Opções da carta, em português.

### Depois de atualizar

Recarregue o browser (Ctrl/Cmd + Shift + R). Na app do telemóvel: **Definições da app → Depuração → Limpar cache do frontend**.

## v1.1.0

### Novidades

- **Escolher a língua da carta**, seja qual for a língua do Home Assistant: `language: pt` ou `language: en` (por omissão `auto`, que segue o HA).
- **Nomes dos programas em português** quando a carta está em português, mesmo com o HA em inglês. A carta traz a sua própria lista, baseada nas traduções da integração hOn, com as gralhas corrigidas ("Rápido", "Diários", "Cocktail"…) e cerca de 20 nomes que lá estavam em inglês traduzidos.
- **Editor visual** nas duas cartas: título, língua, prefixo das entidades e, na carta da máquina, cor e largura máxima. As opções que o editor não mostra (`favourites`, `names`, `rows`…) ficam como estão.

### Como usar

```yaml
type: custom:hon-dishwasher-card
language: pt
```

Ou edite o cartão e escolha **Língua da carta → Português**. Faça o mesmo na carta de programas.

### Depois de atualizar

Recarregue o browser (Ctrl/Cmd + Shift + R). Na app do telemóvel: **Definições da app → Depuração → Limpar cache do frontend**.

## v1.0.0

### Primeira versão

Cartas para a máquina de lavar loiça **Haier XF 6C2M1PX** (I-Pro Shine Série 3) na integração **hOn** ([gvigroux/hon](https://github.com/gvigroux/hon)).

#### `custom:hon-dishwasher-card`
- Desenho da XF 6C2M1PX: porta em inox escovado, pega embutida com o **visor Dot Matrix**, logótipo e rodapé. Também em `white` e `black`.
- Tempo restante a descontar no visor, percentagem e **barra de progresso** (azul a lavar, laranja a secar, verde no fim).
- **Vista para dentro** enquanto lava: gaveta de talheres, cestos, braços aspersores a rodar, água, vapor na secagem e brilhos no fim.
- Fase atual, programa, hora de fim (ou de início, com início diferido), opções ativas e total de ciclos.
- Ícones de **controlo remoto, porta, sal e abrilhantador** (laranja quando é preciso reabastecer).
- Botões **Parar** e **Desligar**, com confirmação.
- Encontra a máquina sozinha; `entity` para escolher outra.

#### `custom:hon-dishwasher-programmes-card`
- Favoritos como botões e lista completa **lida da própria máquina** (sem enviar nada à máquina).
- Toque, confirme e o programa começa (`hon.start_program`).

#### Línguas
Português e inglês.
