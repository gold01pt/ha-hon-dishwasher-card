# Changelog

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
