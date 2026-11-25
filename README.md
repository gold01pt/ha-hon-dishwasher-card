# Carta hOn para Máquina da Loiça (Home Assistant)

Uma carta para máquinas de lavar loiça **Haier, Candy e Hoover** ligadas ao Home Assistant pela integração **hOn** ([gvigroux/hon](https://github.com/gvigroux/hon)), no mesmo estilo da [ha-hon-appliance-card](https://github.com/spikey1965/ha-hon-appliance-card) para máquinas de lavar e secar roupa.

## O que mostra

O desenho segue a **Haier XF 6C2M1PX** (I-Pro Shine Série 3, livre instalação, inox): porta lisa em inox escovado, pega embutida ao centro em cima com o visor Dot Matrix lá dentro, logótipo por baixo e rodapé separado. Por dentro tem os 3 níveis do modelo de 16 conjuntos: gaveta de talheres, cesto superior e cesto inferior.


- **O visor Dot Matrix, na pega:** o tempo restante a descontar ao segundo e a percentagem feita. Com início diferido mostra o tempo até ao fim e "Início diferido".
- **Uma barra de luz de progresso** por baixo da pega: azul a lavar, laranja a secar, verde quando termina.
- **Uma vista para dentro da máquina** enquanto lava: cestos com copos e pratos, braços aspersores a rodar e água; vapor na secagem; brilhos quando termina. A fase atual (Pré-lavagem, Lavagem, Enxaguamento, Secagem) aparece em cima.
- **Ícones** de controlo remoto, porta, **sal** e **abrilhantador** (ficam laranja quando é preciso reabastecer).
- **Programa, estado, hora de fim** (ou hora de início, se diferido) e opções ativas (Extra secagem, Meia carga…). Desligada mostra o total de ciclos.
- **Botões Parar e Desligar** (pedem confirmação), visíveis quando o controlo remoto está ligado.
- **Cartão de programas:** os seus favoritos como botões e a lista completa, lida da própria máquina. Toque, confirme e começa.

As máquinas de loiça hOn não têm pausa pela integração, por isso não há botão Pausa.

## Instalação

1. Copie `hon-dishwasher-card.js` para `config/www/hon-dishwasher-card.js`.
2. Em **Definições → Painéis → ⋮ → Recursos**, adicione `/local/hon-dishwasher-card.js?v=1.0.0` como **Módulo JavaScript**.
3. Recarregue o browser (se atualizar o ficheiro, mude o `?v=`).

## Utilização

```yaml
type: vertical-stack
cards:
  - type: custom:hon-dishwasher-card
    name: Máquina da loiça
    max_width: 380px
  - type: custom:hon-dishwasher-programmes-card
    name: Máquina da loiça
    favourites: [eco, auto_universal, intensive, rapid_29]
```

A carta **encontra a máquina sozinha** (procura o sensor hOn de modo da máquina de loiça). Se tiver mais do que uma, ou se não a encontrar, indique o início dos IDs das entidades. Por exemplo, se tem `sensor.maquina_loica_mode`:

```yaml
type: custom:hon-dishwasher-card
entity: maquina_loica
```

### Opções

| Opção | Carta | O que faz |
|---|---|---|
| `entity` | ambas | Início dos IDs das entidades (por omissão: encontrada automaticamente, senão `dish_washer`) |
| `name` | ambas | Título |
| `colour` | ambas | Cor de destaque, ex. `"#5ab4ff"` |
| `language` | ambas | `pt` ou `en` (por omissão, a língua do Home Assistant) |
| `names` | ambas | Os seus nomes para programas, por chave: `iot_eco_bldc: Eco diário` |
| `max_width` | máquina | Largura máxima, ex. `380px` |
| `rows` | máquina | Linhas da caixa: `programme`, `status`, `ends`, `options`. Por omissão todas |
| `finish` | máquina | Cor da máquina: `inox` (omissão, como a XF 6C2M1PX), `white` ou `black` |
| `phases` | máquina | Nomes para códigos de fase que a carta não conheça, ex. `{6: "Enxaguamento quente"}` |
| `favourites` | programas | Programas a mostrar como botões (chaves hOn) |
| `programmes` | programas | Lista completa. Por omissão é lida da máquina |

### Programas

Os nomes dos programas vêm das traduções da integração hOn, na língua do Home Assistant.

Sem `favourites`, o cartão mostra todos os programas que a máquina aceita: pede a lista à integração chamando `hon.start_program` com um programa inexistente, que é recusado **antes** de enviar qualquer coisa à máquina e devolve a lista de programas válidos. A lista fica guardada no browser durante 7 dias.

Para ver as chaves manualmente: **Ferramentas de programador → Ações**, escolha **hon.start_program**, selecione a máquina e escreva um programa inventado, como `teste`. O erro lista todas as chaves aceites.

## Entidades usadas

Para `entity: dish_washer` (o nome por omissão quando a máquina se chama "Dish Washer" na app hOn):

| Entidade | Para quê |
|---|---|
| `binary_sensor.dish_washer_status` | Ligada / desligada |
| `sensor.dish_washer_mode` | 1 Pronta, 2 A lavar, 3 Início diferido, 7 Terminado |
| `sensor.dish_washer_program_phase` | A fase (Pré-lavagem, Lavagem, Enxaguamento, Secagem) |
| `sensor.dish_washer_program_name` / `_program_code` | O programa |
| `sensor.dish_washer_start_time`, `_end_time`, `_remaining_time` | Contagem e barra de progresso |
| `sensor.dish_washer_delay_time` | Hora de início diferido |
| `sensor.dish_washer_total_wash_cycle` | Total de ciclos |
| `binary_sensor.dish_washer_remote_control` | Ícone e botões |
| `binary_sensor.dish_washer_door_status` | Porta |
| `binary_sensor.dish_washer_salt`, `_rinse_aid` | Sal e abrilhantador |
| `binary_sensor.dish_washer_extra_dry`, `_half_load`, `_eco_express`, `_open_door_at_end` | Opções |

Faltando alguma, a carta simplesmente não mostra essa parte.

## Notas

- **Sal e abrilhantador:** a carta assume que `on` significa "reabastecer", como na app hOn. Se na sua máquina for ao contrário, diga-me.
- **Códigos de fase:** os códigos de fase das máquinas de loiça hOn não estão documentados na integração. Se aparecer "Fase N", use a opção `phases` ou diga-me o que a máquina estava a fazer.
- `preview.html` é uma pré-visualização com dados simulados (abra-a através de um servidor local, ex. `python3 -m http.server`).

MIT. Baseada no design da [ha-hon-appliance-card](https://github.com/spikey1965/ha-hon-appliance-card). Sem afiliação com Haier, Candy ou Hoover.
